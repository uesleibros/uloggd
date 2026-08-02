-- Minerals: what a level is worth beyond the number.
--
-- Reaching a level pays out exactly one mineral, drawn against fixed odds.
-- Copper is common and ruby is not: at 0.2% an account would need to cross
-- roughly five hundred levels to expect one, which on this curve is a lifetime.
-- That is the point. A currency that everyone has a lot of buys nothing, and
-- the shop these are for does not exist yet, so the scarcity has to be right
-- before anything is priced against it.
--
-- The awkward part of this design is that a level here is not an event. It is
-- derived from what someone has logged, recomputed on every read, so there is
-- no moment to hang a reward on and no trigger that could fire. Levels are
-- claimed instead: `claim_level_minerals` works out which levels have been
-- reached and not yet paid, and pays them. It is idempotent through a unique
-- key on the ledger rather than through a flag, so two calls racing each other
-- cannot both win.
--
-- The roll happens here and never on the client. A client-side draw is a
-- client-side reroll, and a currency people can reroll is not a currency.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'MineralKind') then
    create type public."MineralKind" as enum
      ('COPPER', 'IRON', 'GOLD', 'EMERALD', 'DIAMOND', 'RUBY');
  end if;
end
$$;

/**
 * The odds, in tenths of a percent, and the order they are shown in.
 *
 * Weights rather than probabilities so the draw is one comparison against a
 * running total: a probability table has to sum to exactly one and silently
 * breaks when a rate is edited, while weights only have to be positive.
 *
 * Stated once here and read by both the draw and the interface, so the odds
 * shown to someone are the odds they are playing.
 */
create or replace function public.mineral_rates()
returns table (mineral public."MineralKind", weight integer, rank integer)
language sql immutable set search_path = '' as $$
  values
    ('COPPER'::public."MineralKind", 450, 1),
    ('IRON'::public."MineralKind", 270, 2),
    ('GOLD'::public."MineralKind", 150, 3),
    ('EMERALD'::public."MineralKind", 80, 4),
    ('DIAMOND'::public."MineralKind", 48, 5),
    ('RUBY'::public."MineralKind", 2, 6)
$$;

grant execute on function public.mineral_rates() to anon, authenticated;

-- One row per level ever paid. The unique key is the whole idempotency story:
-- a level cannot be paid twice, however many times the claim is called and
-- however many calls overlap.
create table if not exists public.mineral_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  level integer not null,
  mineral public."MineralKind" not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (profile_id, level)
);

create index if not exists mineral_grants_profile_idx
  on public.mineral_grants (profile_id, created_at desc);

alter table public.mineral_grants enable row level security;

-- Readable by anyone: a wallet is part of a profile, like a level is, and
-- hiding it would make the number on the badge unexplainable to a visitor.
drop policy if exists mineral_grants_read on public.mineral_grants;
create policy mineral_grants_read on public.mineral_grants for select using (true);

-- Nobody writes this from the API. The only way in is the claim function,
-- which runs as the definer.
revoke all on public.mineral_grants from anon, authenticated;
grant select on public.mineral_grants to anon, authenticated;

/**
 * Draws one mineral against the weights.
 *
 * `random()` is not cryptographic and does not need to be: the client never
 * sees a seed and never performs the draw. What matters is that the roll
 * happens once, server side, and is written down before anyone sees it.
 *
 * Written as a loop over one held value rather than as a `where` clause on the
 * bands. The single-statement version put `random()` in the predicate, where
 * Postgres evaluated it once per band instead of once per draw: iron came out
 * at 39.7% against a stated 27, emerald at 1.9 against 8, and ruby never came
 * out at all across two hundred thousand rolls.
 */
create or replace function private.draw_mineral()
returns public."MineralKind"
language plpgsql volatile set search_path = ''
as $$
declare
  total integer;
  roll numeric;
  running integer := 0;
  band record;
begin
  select sum(rate.weight) into total from public.mineral_rates() as rate;
  roll := random() * total;
  for band in
    select rate.mineral, rate.weight
      from public.mineral_rates() as rate
     order by rate.rank
  loop
    running := running + band.weight;
    if roll < running then
      return band.mineral;
    end if;
  end loop;
  -- Only reachable if the roll lands exactly on the total, which `random()`
  -- excludes; the common mineral is the safe answer rather than a null.
  return 'COPPER';
end;
$$;

/**
 * Pays out every level reached and not yet paid, and returns what was won.
 *
 * Returns the grants rather than nothing, so the interface can say what
 * arrived instead of asking for the wallet again and diffing it.
 *
 * Capped per call. An account that somehow owes hundreds of levels gets them
 * over several calls rather than holding a transaction open while it rolls,
 * and the cap is far above what any real gap can be.
 */
create or replace function public.claim_level_minerals()
returns table (level integer, mineral public."MineralKind")
language plpgsql security definer set search_path = ''
as $$
-- The `returns table` names are plpgsql variables, and two of them are also
-- column names here. Without this, `on conflict (profile_id, level)` cannot
-- tell the output parameter from the column and refuses the whole statement.
-- Columns win; the declared variables below are named so they never collide.
#variable_conflict use_column
declare
  caller uuid := auth.uid();
  current_level integer;
  paid integer;
  target integer;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select standing.level into current_level
    from public.profile_level(caller) as standing;

  select coalesce(max(grant_row.level), 1) into paid
    from public.mineral_grants grant_row
   where grant_row.profile_id = caller;

  -- Level 1 pays nothing. It is where everyone starts, so rewarding it would
  -- hand a mineral to an account that has done nothing at all.
  for target in (paid + 1)..least(current_level, paid + 50) loop
    insert into public.mineral_grants (profile_id, level, mineral)
    values (caller, target, private.draw_mineral())
    -- Another call got there first. Its draw stands; re-rolling would let a
    -- caller retry a level until it liked the result.
    on conflict (profile_id, level) do nothing;
  end loop;

  return query
    select grant_row.level, grant_row.mineral
      from public.mineral_grants grant_row
     where grant_row.profile_id = caller
       and grant_row.level > paid
     order by grant_row.level;
end;
$$;

revoke all on function public.claim_level_minerals() from public, anon;
grant execute on function public.claim_level_minerals() to authenticated;

/**
 * A profile's wallet: every mineral, including the ones at zero.
 *
 * Zeroes are included on purpose. A wallet that lists only what someone owns
 * cannot show what there is to want, and the empty slots are most of what
 * makes the rare ones legible.
 */
create or replace function public.profile_minerals(target uuid)
returns table (
  mineral public."MineralKind",
  amount bigint,
  weight integer,
  rank integer
)
language sql stable security definer set search_path = ''
as $$
  select rate.mineral,
         count(grant_row.id) as amount,
         rate.weight,
         rate.rank
    from public.mineral_rates() as rate
    left join public.mineral_grants grant_row
      on grant_row.mineral = rate.mineral
     and grant_row.profile_id = target
   group by rate.mineral, rate.weight, rate.rank
   order by rate.rank
$$;

revoke all on function public.profile_minerals(uuid) from public;
grant execute on function public.profile_minerals(uuid) to anon, authenticated;
