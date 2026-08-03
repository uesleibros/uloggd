-- Minerals arrive when the level is earned, not when the wallet is opened.
--
-- The claim was client side: `WalletWorkspace` called it when the owner
-- visited their own wallet. That works for whoever goes looking and pays
-- nothing to everyone else, which is exactly what happened. After the account
-- ports, one account sat at level 7 with no minerals at all and another at
-- level 5 with the four it was owed, and the only difference between them was
-- that one had opened the page.
--
-- A reward that depends on being sought is not a reward. It moves to where the
-- level actually changes: the moment activity is written.
--
-- Statement level, not row level. A backloggd import inserts a thousand
-- library rows in one statement, and a row trigger would run the whole XP
-- aggregate a thousand times for a level that can only move once. The
-- transition table gives the distinct profiles touched, and each is settled
-- once.
--
-- Every trigger is wrapped so a failure here can never block the write that
-- fired it. Somebody publishing a review must not lose it because the mineral
-- ledger had a bad day; the worst case is the grant arrives later, since the
-- next activity or a wallet visit settles it.

/**
 * Pays a profile every level it has reached and not yet been paid for.
 *
 * The whole grant logic, with no auth check, so both the trigger and the
 * caller-facing claim can share it instead of drifting apart. Level 1 pays
 * nothing: everyone starts there.
 */
create or replace function private.grant_level_minerals(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  current_level integer;
  paid integer;
  step integer;
begin
  if target is null then return; end if;

  select standing.level into current_level
    from public.profile_level(target) as standing;
  if current_level is null or current_level < 2 then return; end if;

  select coalesce(max(g.level), 1) into paid
    from public.mineral_grants g
   where g.profile_id = target;
  if paid >= current_level then return; end if;

  -- Capped per call so a pathological gap cannot hold a write open while it
  -- rolls; the next activity settles the rest.
  for step in (paid + 1)..least(current_level, paid + 50) loop
    insert into public.mineral_grants (profile_id, level, mineral)
    values (target, step, private.draw_mineral())
    -- Another writer got there first. Its draw stands: re-rolling would let a
    -- caller retry a level until it liked the result.
    on conflict (profile_id, level) do nothing;
  end loop;
end;
$$;

revoke all on function private.grant_level_minerals(uuid) from public, anon, authenticated;

/**
 * Settles every profile touched by the statement that fired this.
 *
 * Swallows its own failures on purpose. This runs inside somebody else's
 * transaction, and a mineral ledger problem must never cost them the review,
 * session or import they were writing.
 */
create or replace function private.settle_minerals_after_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare owner uuid;
begin
  begin
    for owner in
      select distinct profile_id from inserted where profile_id is not null
    loop
      perform private.grant_level_minerals(owner);
    end loop;
  exception when others then
    -- Deliberately silent. The grant is idempotent and the next write or
    -- wallet visit will settle it.
    null;
  end;
  return null;
end;
$$;

/** The same, for the two comment tables, which key their author differently. */
create or replace function private.settle_minerals_after_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare owner uuid;
begin
  begin
    for owner in
      select distinct author_id from inserted where author_id is not null
    loop
      perform private.grant_level_minerals(owner);
    end loop;
  exception when others then
    null;
  end;
  return null;
end;
$$;

-- One trigger per scored table. The list has to match what `profile_level`
-- counts; a table added to the scoring without a trigger here goes back to
-- paying only the people who go looking.
do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('diary_entries', 'profile_id'),
      ('reviews', 'profile_id'),
      ('journeys', 'profile_id'),
      ('game_lists', 'profile_id'),
      ('screenshots', 'profile_id'),
      ('user_games', 'profile_id'),
      ('content_comments', 'author_id'),
      ('profile_comments', 'author_id')
    ) as t(table_name, owner_column)
  loop
    execute format(
      'drop trigger if exists settle_minerals on public.%I',
      entry.table_name
    );
    execute format(
      'create trigger settle_minerals
         after insert on public.%I
         referencing new table as inserted
         for each statement
         execute function private.%I()',
      entry.table_name,
      case when entry.owner_column = 'author_id'
        then 'settle_minerals_after_comment'
        else 'settle_minerals_after_activity'
      end
    );
  end loop;
end
$$;

/**
 * The caller-facing claim, now a thin wrapper.
 *
 * Kept because it is what settles accounts whose activity all predates the
 * triggers, and because a page that shows a wallet should be able to make sure
 * it is showing the truth.
 */
create or replace function public.claim_level_minerals()
returns table (level integer, mineral public."MineralKind")
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  caller uuid := auth.uid();
  paid_before integer;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select coalesce(max(g.level), 1) into paid_before
    from public.mineral_grants g
   where g.profile_id = caller;

  perform private.grant_level_minerals(caller);

  return query
    select g.level, g.mineral
      from public.mineral_grants g
     where g.profile_id = caller
       and g.level > paid_before
     order by g.level;
end;
$$;

revoke all on function public.claim_level_minerals() from public, anon;
grant execute on function public.claim_level_minerals() to authenticated;

-- Everyone who levelled up before any of this existed. Without it the ported
-- accounts stay at zero forever: their activity is already written, so no
-- trigger will ever fire for it.
do $$
declare owner uuid;
begin
  for owner in select id from public.profiles loop
    perform private.grant_level_minerals(owner);
  end loop;
end
$$;
