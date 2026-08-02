-- Sending minerals to somebody else.
--
-- This turns a wallet from a counter into an account, and the difference
-- matters: a counter can be recomputed from what happened, while an account
-- has to be able to go down. `mineral_grants` alone could only ever grow, so
-- the balance is now grants plus what came in minus what went out, over an
-- append-only ledger. Nothing is ever edited or deleted, which is what makes a
-- disputed transfer answerable a year later.
--
-- The one hard part is double spending. Two sends racing each other can both
-- read the same balance and both pass, leaving an account that gave away more
-- than it had. The sender's profile row is locked for the duration, which
-- serialises everything one account sends and costs nothing, because nobody
-- sends from two devices at the same instant.

-- The kind list is a check constraint rather than an enum, so a new kind is
-- added by restating the whole list. Missing one silently drops every
-- notification of that type at insert time.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'follow', 'review_like', 'list_like', 'profile_comment',
    'profile_comment_like', 'screenshot_like', 'screenshot_comment',
    'screenshot_comment_like', 'moderation_comment_removed',
    'journal_like', 'post_comment', 'post_comment_like',
    'mineral_transfer'
  )
);

-- Every accepted kind has to have a delivery preference too, or it is
-- accepted by the table and dropped on the way out. Three existing tests
-- caught this addition missing exactly that.
create or replace function public.notification_preference_enabled(
  owner_id uuid,
  preference_kind text
)
returns boolean language sql stable security definer set search_path = '' as $$
  select case preference_kind
    when 'follow' then coalesce(p.follows_enabled, true)
    when 'review_like' then coalesce(p.review_likes_enabled, true)
    when 'list_like' then coalesce(p.list_likes_enabled, true)
    when 'journal_like' then coalesce(p.journal_likes_enabled, true)
    when 'profile_comment' then coalesce(p.comments_enabled, true)
    when 'profile_comment_like' then coalesce(p.comments_enabled, true)
    when 'post_comment' then coalesce(p.comments_enabled, true)
    when 'post_comment_like' then coalesce(p.comments_enabled, true)
    when 'screenshot_like' then coalesce(p.screenshots_enabled, true)
    when 'screenshot_comment' then coalesce(p.screenshots_enabled, true)
    when 'screenshot_comment_like' then coalesce(p.screenshots_enabled, true)
    -- Someone sent you something. Not opt-out for the same reason moderation
    -- is not: it changes what you own, so finding out is not optional.
    when 'mineral_transfer' then true
    when 'moderation_comment_removed' then true
    else false end
  from (select 1) seed
  left join public.notification_preferences p on p.profile_id = owner_id
$$;

create table if not exists public.mineral_transfers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  created_at timestamptz not null default clock_timestamp(),
  constraint mineral_transfers_note_check
    check (note is null or char_length(btrim(note)) between 1 and 140),
  constraint mineral_transfers_not_self check (sender_id <> recipient_id)
);

create table if not exists public.mineral_transfer_items (
  transfer_id uuid not null references public.mineral_transfers (id) on delete cascade,
  mineral public."MineralKind" not null,
  amount integer not null check (amount > 0),
  primary key (transfer_id, mineral)
);

create index if not exists mineral_transfers_sender_idx
  on public.mineral_transfers (sender_id, created_at desc);
create index if not exists mineral_transfers_recipient_idx
  on public.mineral_transfers (recipient_id, created_at desc);

alter table public.mineral_transfers enable row level security;
alter table public.mineral_transfer_items enable row level security;

-- Visible to the two people involved, and nobody else. A wallet's contents are
-- public because a collection is meant to be seen; who sent what to whom is a
-- different question, and the answer belongs to the pair.
drop policy if exists mineral_transfers_read on public.mineral_transfers;
create policy mineral_transfers_read on public.mineral_transfers
  for select using (
    (select auth.uid()) in (sender_id, recipient_id)
  );

drop policy if exists mineral_transfer_items_read on public.mineral_transfer_items;
create policy mineral_transfer_items_read on public.mineral_transfer_items
  for select using (
    exists (
      select 1 from public.mineral_transfers t
       where t.id = transfer_id
         and (select auth.uid()) in (t.sender_id, t.recipient_id)
    )
  );

-- Written only by the definer function below. A client that can insert here
-- can mint minerals, so nothing but select is granted.
revoke all on public.mineral_transfers from anon, authenticated;
revoke all on public.mineral_transfer_items from anon, authenticated;
grant select on public.mineral_transfers to authenticated;
grant select on public.mineral_transfer_items to authenticated;

/**
 * A profile's balance per mineral: what it was given, plus in, minus out.
 *
 * Replaces the plain count over `mineral_grants`, which stopped being the
 * balance the moment minerals could move.
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
         coalesce((
           select count(*) from public.mineral_grants g
            where g.profile_id = target and g.mineral = rate.mineral
         ), 0)
         + coalesce((
           select sum(i.amount)
             from public.mineral_transfer_items i
             join public.mineral_transfers t on t.id = i.transfer_id
            where t.recipient_id = target and i.mineral = rate.mineral
         ), 0)
         - coalesce((
           select sum(i.amount)
             from public.mineral_transfer_items i
             join public.mineral_transfers t on t.id = i.transfer_id
            where t.sender_id = target and i.mineral = rate.mineral
         ), 0) as amount,
         rate.weight,
         rate.rank
    from public.mineral_rates() as rate
   order by rate.rank
$$;

revoke all on function public.profile_minerals(uuid) from public;
grant execute on function public.profile_minerals(uuid) to anon, authenticated;

/**
 * Sends minerals to another account.
 *
 * `items` is `{"RUBY": 1, "COPPER": 3}`. Everything is checked here and
 * nothing is trusted from the client: a balance computed in the browser is a
 * balance the browser can lie about.
 *
 * Refuses, rather than silently sending less: a transfer that quietly rounds
 * itself down is worse than one that fails, because the sender walks away
 * believing something else happened.
 */
create or replace function public.send_minerals(
  recipient uuid,
  items jsonb,
  note text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  transfer uuid;
  entry record;
  available bigint;
  total integer := 0;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if recipient is null or recipient = caller then
    raise exception 'cannot send to yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = recipient) then
    raise exception 'recipient not found' using errcode = '22023';
  end if;
  -- Blocking is a statement about not wanting contact, and an unsolicited gift
  -- with a note attached is contact.
  if public.viewer_blocked_with(recipient) then
    raise exception 'cannot send to this account' using errcode = '42501';
  end if;

  -- Serialises everything this account sends. Without it two concurrent calls
  -- both read the same balance, both pass, and the account ends up in debt.
  perform 1 from public.profiles where id = caller for update;

  insert into public.mineral_transfers (sender_id, recipient_id, note)
  values (caller, recipient, nullif(btrim(coalesce(note, '')), ''))
  returning id into transfer;

  for entry in
    select key::public."MineralKind" as mineral, value::text::integer as amount
      from jsonb_each(items)
  loop
    if entry.amount <= 0 then
      raise exception 'amount must be positive' using errcode = '22023';
    end if;

    select standing.amount into available
      from public.profile_minerals(caller) as standing
     where standing.mineral = entry.mineral;

    -- The balance already has this transfer's rows subtracted from it once the
    -- item is inserted, so it is read before the insert, per mineral.
    if available is null or available < entry.amount then
      raise exception 'not enough %', entry.mineral using errcode = '22023';
    end if;

    insert into public.mineral_transfer_items (transfer_id, mineral, amount)
    values (transfer, entry.mineral, entry.amount);
    total := total + entry.amount;
  end loop;

  if total = 0 then
    raise exception 'nothing to send' using errcode = '22023';
  end if;

  -- Told, not discovered. Receiving something has to arrive as news rather
  -- than be found by chance on a page nobody reloads.
  insert into public.notifications (recipient_id, actor_id, kind, target_id, target_title)
  values (recipient, caller, 'mineral_transfer', transfer, total::text);

  return transfer;
end;
$$;

revoke all on function public.send_minerals(uuid, jsonb, text) from public, anon;
grant execute on function public.send_minerals(uuid, jsonb, text) to authenticated;
