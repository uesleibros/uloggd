-- Playlog: a session you open when you start playing, not a form you fill in
-- when you stop.
--
-- The whole design rests on one decision: a live session is an open diary
-- entry, not a new kind of post. Everything downstream of `diary_entries`
-- already works -- the feed, the year retrospective, journeys, likes,
-- comments, moderation, the public API -- and a second post type would need
-- all of it again and leave a reader asking what the difference is. Closing a
-- session produces exactly the row the composer produces today.
--
-- See docs/product/playlog.md. The four questions that document left open are
-- answered here, each beside the thing that answers it.

-- The instant a live session began, and nothing else. Null for every entry
-- written the way they are written today, which is what keeps this change
-- invisible to everything that already reads this table.
--
-- `started_at` could not be reused: it is `time without time zone`, a wall
-- clock with no date and no zone, so it cannot say how long a session has
-- been going across midnight or across a device.
alter table public.diary_entries
  add column if not exists open_since timestamptz;

-- One open session per person, not one per game.
--
-- One per game sounds more flexible and makes "add to the session" ambiguous
-- the moment two are open: every event would need a target picker, and being
-- quick is the entire point. Somebody alternating between two games in an
-- evening closes one and opens the other, which costs two presses and leaves
-- two honest entries instead of one guess.
create unique index if not exists diary_entries_one_open_per_profile
  on public.diary_entries (profile_id) where open_since is not null;

-- An open session is a draft with a clock on it, and a draft must not be a
-- post. Hidden from every reader including its author, who reaches it through
-- `own_play_session` below: one rule in the database beats remembering to
-- filter it out of the feed, the profile, the journey, the year and the API.
drop policy if exists diary_visible_read on public.diary_entries;
create policy diary_visible_read on public.diary_entries
  for select to anon, authenticated
  using (
    open_since is null
    and not public.viewer_blocked_with(profile_id)
    and (
      visibility = 'PUBLIC'
      or auth.uid() = profile_id
      or (visibility = 'FOLLOWERS' and exists(
        select 1 from public.follows
        where follower_id = auth.uid() and following_id = diary_entries.profile_id
      ))
    )
  );

-- The helper every "can this reader see this entry" policy asks, and it is
-- `security definer`, so it answers from inside its own rules rather than
-- from the policy above. Without this line the events and the images of an
-- open session were readable by anybody while the session itself was not.
create or replace function public.diary_entry_visible(target_entry uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.diary_entries entry
    where entry.id = target_entry
      and entry.open_since is null
      and not public.users_blocked(auth.uid(), entry.profile_id)
      and (
        entry.visibility = 'PUBLIC'
        or entry.profile_id = auth.uid()
        or (entry.visibility = 'FOLLOWERS' and exists(
          select 1 from public.follows
          where follower_id = auth.uid() and following_id = entry.profile_id
        ))
      )
  )
$$;

create table if not exists public.diary_entry_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries(id) on delete cascade,
  -- Denormalised for the row policy, the way diary_entry_images already does
  -- it: a policy that has to join to find the owner is one that gets written
  -- wrong once.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('NOTE', 'SHOT', 'PROGRESS', 'STOP')),
  body varchar(500),
  -- Where they got to. Free text, because "chapter 4", "60%" and "beat
  -- Ganon" are all answers people give and none of them is a number.
  marker varchar(80),
  screenshot_id uuid references public.screenshots(id) on delete set null,
  -- The event's own instant rather than its insert time, so one added five
  -- minutes late can still say when it happened.
  at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint diary_entry_events_body_check check (
    body is null or char_length(body) between 1 and 500
  ),
  constraint diary_entry_events_marker_check check (
    marker is null or char_length(marker) between 1 and 80
  ),
  -- Every kind has to carry the thing that makes it that kind.
  constraint diary_entry_events_payload_check check (
    (kind = 'NOTE' and body is not null)
    or (kind = 'STOP' and body is not null)
    or (kind = 'PROGRESS' and marker is not null)
    or (kind = 'SHOT' and screenshot_id is not null)
  )
);

create index if not exists diary_entry_events_entry_idx
  on public.diary_entry_events (entry_id, at);

alter table public.diary_entry_events enable row level security;

-- Read follows the entry, exactly as the images do. An event on an open
-- session is unreadable through this, since the helper reads the entry and
-- the entry is hidden while it is open.
drop policy if exists diary_events_visible_read on public.diary_entry_events;
create policy diary_events_visible_read on public.diary_entry_events
  for select to anon, authenticated
  using (public.diary_entry_visible(entry_id));

-- Writes go through the definer functions below, which is what enforces
-- "only onto your own session, and only while it is open".
grant select on public.diary_entry_events to anon, authenticated;

/**
 * Opens a session, or says one is already open.
 *
 * `played_on` is today and `minutes` stays null: this row is not a record of
 * anything yet. The visibility is the author's choice at the start, and it is
 * what a screenshot taken during the session will default to.
 */
create or replace function public.open_play_session(
  game_id integer,
  game_slug text,
  journey uuid default null,
  session_visibility public."Visibility" default 'PUBLIC'
)
returns public.diary_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.diary_entries;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if game_id <= 0 or game_slug is null
     or char_length(trim(game_slug)) not between 1 and 255 then
    raise exception 'invalid game' using errcode = '22023';
  end if;
  if exists(
    select 1 from public.diary_entries
    where profile_id = auth.uid() and open_since is not null
  ) then
    -- Named rather than left to the unique index, so the interface can offer
    -- the one that is open instead of reporting a constraint.
    raise exception 'a session is already open' using errcode = '55006';
  end if;
  if journey is not null and not exists(
    select 1 from public.journeys
    where id = journey and profile_id = auth.uid()
  ) then
    raise exception 'journey not found' using errcode = '42501';
  end if;

  insert into public.diary_entries
    (profile_id, igdb_id, game_slug, played_on, visibility, journey_id, open_since)
  values
    (auth.uid(), game_id, trim(game_slug), current_date, session_visibility,
     journey, now())
  returning * into result;
  return result;
end;
$$;

/**
 * Appends one thing that happened.
 *
 * Only onto a session of your own that is still open: an entry that has been
 * closed is a post, and a post is edited through the composer rather than
 * appended to.
 */
create or replace function public.add_play_event(
  session uuid,
  event_kind text,
  event_body text default null,
  event_marker text default null,
  shot uuid default null,
  happened_at timestamptz default null
)
returns public.diary_entry_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.diary_entry_events;
  opened timestamptz;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select open_since into opened from public.diary_entries
  where id = session and profile_id = auth.uid();
  if opened is null then
    raise exception 'session not open' using errcode = '42501';
  end if;
  if event_kind not in ('NOTE', 'SHOT', 'PROGRESS', 'STOP') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  if shot is not null and not exists(
    select 1 from public.screenshots
    where id = shot and profile_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'screenshot not found' using errcode = '42501';
  end if;

  insert into public.diary_entry_events
    (entry_id, profile_id, kind, body, marker, screenshot_id, at)
  values (
    session, auth.uid(), event_kind,
    nullif(trim(coalesce(event_body, '')), ''),
    nullif(trim(coalesce(event_marker, '')), ''),
    shot,
    -- Never before the session began, and never in the future.
    least(greatest(coalesce(happened_at, now()), opened), now())
  )
  returning * into result;

  update public.diary_entries set updated_at = now() where id = session;
  return result;
end;
$$;

/**
 * Closes a session, which is what turns it into a post.
 *
 * The clock is a suggestion, never a claim: people leave a game paused and go
 * to lunch, and they know it. `session_minutes` is what the author confirmed.
 *
 * When they confirm nothing the elapsed time is used, capped at sixteen
 * hours, because a session open longer than that was forgotten rather than
 * heroic and recording a day and a half of play is worse than recording an
 * hour too few. That cap is here rather than in the interface so no caller
 * can write a number nobody could have played.
 */
create or replace function public.close_play_session(
  session uuid,
  session_minutes integer default null,
  session_note text default null,
  finished boolean default null
)
returns public.diary_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.diary_entries;
  opened timestamptz;
  elapsed integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select open_since into opened from public.diary_entries
  where id = session and profile_id = auth.uid();
  if opened is null then
    raise exception 'session not open' using errcode = '42501';
  end if;
  if session_minutes is not null
     and (session_minutes < 0 or session_minutes > 100000) then
    raise exception 'invalid minutes' using errcode = '22023';
  end if;

  elapsed := least(
    floor(extract(epoch from (now() - opened)) / 60)::integer,
    960
  );

  update public.diary_entries
  set
    open_since = null,
    minutes = nullif(coalesce(session_minutes, elapsed), 0),
    -- The session began on the day it began, whatever day it is now, and a
    -- session across midnight says so in the range it already has.
    played_on = (opened at time zone 'UTC')::date,
    ended_on = case
      when current_date > (opened at time zone 'UTC')::date then current_date
      else ended_on
    end,
    note = coalesce(nullif(trim(coalesce(session_note, '')), ''), note),
    marks_finish = coalesce(finished, marks_finish),
    updated_at = now()
  where id = session and profile_id = auth.uid()
  returning * into result;
  return result;
end;
$$;

/**
 * Throws away a session that recorded nothing.
 *
 * Opened and forgotten is not a thing somebody did, and a row saying they
 * played for no time and wrote nothing about it is worse than no row. Only
 * while it is empty: once there is an event on it, closing is the way out.
 */
create or replace function public.abandon_play_session(session uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  delete from public.diary_entries
  where id = session
    and profile_id = auth.uid()
    and open_since is not null
    and not exists(
      select 1 from public.diary_entry_events where entry_id = session
    );
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

/**
 * The reader's own open session, if they have one.
 *
 * Through a definer function because the read policy hides open entries from
 * everybody, which is what stops a draft reaching the feed. This is the one
 * door, and it only ever opens onto the caller's own.
 *
 * `setof`, so no open session is no rows. Returning the composite type plain
 * hands back a single row of nulls instead, which every caller reads as a
 * session that exists and has no id.
 */
-- Dropped first: `create or replace` cannot change a return type, and this
-- one went from the composite to a set of it while the migration was being
-- written. A re-run of this file has to reach the same place as a first run.
drop function if exists public.own_play_session();
create function public.own_play_session()
returns setof public.diary_entries
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.diary_entries
  where profile_id = auth.uid() and open_since is not null
  limit 1
$$;

/** The events of one's own open session, oldest first. */
create or replace function public.own_play_events()
returns setof public.diary_entry_events
language sql
stable
security definer
set search_path = ''
as $$
  select event.* from public.diary_entry_events event
  join public.diary_entries entry on entry.id = event.entry_id
  where entry.profile_id = auth.uid() and entry.open_since is not null
  order by event.at, event.created_at
$$;

revoke all on function public.open_play_session(integer, text, uuid, public."Visibility") from public, anon;
revoke all on function public.add_play_event(uuid, text, text, text, uuid, timestamptz) from public, anon;
revoke all on function public.close_play_session(uuid, integer, text, boolean) from public, anon;
revoke all on function public.abandon_play_session(uuid) from public, anon;
revoke all on function public.own_play_session() from public, anon;
revoke all on function public.own_play_events() from public, anon;

grant execute on function public.open_play_session(integer, text, uuid, public."Visibility") to authenticated;
grant execute on function public.add_play_event(uuid, text, text, text, uuid, timestamptz) to authenticated;
grant execute on function public.close_play_session(uuid, integer, text, boolean) to authenticated;
grant execute on function public.abandon_play_session(uuid) to authenticated;
grant execute on function public.own_play_session() to authenticated;
grant execute on function public.own_play_events() to authenticated;
