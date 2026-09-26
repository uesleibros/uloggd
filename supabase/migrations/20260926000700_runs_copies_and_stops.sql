-- Three things the run and its copy still got wrong.
--
-- 1. A run could point at a copy of a different game. The function checked
--    that the copy belonged to the caller and stopped there, so "Resident
--    Evil 4, played on my Skyrim cartridge" was a thing the database would
--    accept. Nothing in the interface offers it, which is exactly why it
--    would have gone unnoticed.
--
-- 2. There was no way to say "I do not know what I played this on" once a
--    copy had been chosen. Every argument here is `coalesce`d so that saving
--    one field leaves the others alone, which is right, and it means null
--    cannot also mean "clear it". So clearing gets its own flag.
--
-- 3. `journeys.progress` and a STOP event were two answers to "where is this
--    run". The column was only ever written by hand and the events were only
--    ever read one session at a time, so a run could say "chapter 4" in the
--    header while its last session said it stopped before the tower boss.
--    The newest statement wins now, whoever made it: writing a STOP or a
--    PROGRESS during a session moves the run's progress with it.

create or replace function public.update_journey_details(
  target_journey uuid,
  journey_status text default null,
  started date default null,
  finished date default null,
  copy uuid default null,
  is_replay boolean default null,
  is_mastered boolean default null,
  journey_difficulty text default null,
  journey_progress text default null,
  clear_copy boolean default false
)
returns public.journeys
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.journeys;
  run_game integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select igdb_id into run_game from public.journeys
  where id = target_journey and profile_id = auth.uid();
  if run_game is null then
    raise exception 'journey not found' using errcode = '42501';
  end if;

  -- The caller's copy, and a copy of the game this run is a run of.
  if copy is not null and not exists(
    select 1 from public.library_entries
    where id = copy and profile_id = auth.uid() and igdb_id = run_game
  ) then
    raise exception 'copy not found' using errcode = '42501';
  end if;

  update public.journeys set
    status = coalesce(journey_status, status),
    started_on = coalesce(started, started_on),
    finished_on = coalesce(finished, finished_on),
    library_entry_id = case
      when clear_copy then null
      else coalesce(copy, library_entry_id)
    end,
    replay = coalesce(is_replay, replay),
    mastered = coalesce(is_mastered, mastered),
    difficulty = coalesce(
      nullif(trim(coalesce(journey_difficulty, '')), ''), difficulty
    ),
    progress = coalesce(
      nullif(trim(coalesce(journey_progress, '')), ''), progress
    ),
    updated_at = now()
  where id = target_journey and profile_id = auth.uid()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.update_journey_details(
  uuid, text, date, date, uuid, boolean, boolean, text, text, boolean
) from public, anon;
grant execute on function public.update_journey_details(
  uuid, text, date, date, uuid, boolean, boolean, text, text, boolean
) to authenticated;

-- The older signature, before `clear_copy`, would otherwise stay behind as a
-- second function that `update_journey_details(target_journey => ...)` also
-- matches, and the call would answer "function is not unique".
drop function if exists public.update_journey_details(
  uuid, text, date, date, uuid, boolean, boolean, text, text
);

/**
 * Appends one thing that happened, and moves the run's progress with it.
 *
 * A STOP is where somebody stopped and a PROGRESS is where they got to, and
 * both are statements about where the run is. The run had a column saying
 * that already, written only by hand, so the two could disagree: the header
 * said "chapter 4" while the last session said "before the tower boss". The
 * newest statement wins, which is the only rule that stays true without
 * anybody maintaining it.
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
  run uuid;
  said text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select open_since, journey_id into opened, run from public.diary_entries
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

  if run is not null and event_kind in ('STOP', 'PROGRESS') then
    said := coalesce(result.marker, result.body);
    if said is not null then
      update public.journeys
      set progress = left(said, 160), updated_at = now()
      where id = run and profile_id = auth.uid();
    end if;
  end if;

  update public.diary_entries set updated_at = now() where id = session;
  return result;
end;
$$;

/**
 * Where the caller stopped last time, in this run.
 *
 * Context, not a rule: it is shown beside a session that has just been opened
 * and blocks nothing. Closed sessions only, and the caller's own, which is
 * the same thing the events policy says.
 */
create or replace function public.last_stop(run uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(event.body, event.marker)
  from public.diary_entry_events event
  join public.diary_entries entry on entry.id = event.entry_id
  where entry.journey_id = run
    and entry.profile_id = auth.uid()
    and entry.open_since is null
    and event.kind in ('STOP', 'PROGRESS')
  order by event.at desc, event.created_at desc
  limit 1
$$;

revoke all on function public.last_stop(uuid) from public, anon;
grant execute on function public.last_stop(uuid) to authenticated;
