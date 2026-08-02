-- Levelling is meant to be hard, and to get harder.
--
-- The previous curve charged 20 XP more per level, which made the top of the
-- site reachable in a few evenings: a level that arrives on its own says
-- nothing about the person wearing it. Each level now costs 50 more than the
-- one before, so the cost of the next one is always half again what the last
-- one was and the number keeps meaning more the higher it goes.
--
-- Steep, but not still. The first levels still arrive quickly, which is the
-- part that has to work: a ring that never visibly moves for a new account
-- teaches people to ignore it, and then no curve above it matters. 50 XP to
-- level 2, 150 for the third, 300 for the fourth, then 2250 for level 10 and
-- 9500 for level 20, which is a year of real use rather than a weekend.
--
-- A library also stops being able to carry a level on its own. An account
-- imported 1006 games in one go and came out at level 7, above everyone who
-- had written anything, which is the exact opposite of what the number is for.
-- Curating a library is worth something and is capped at what a hundred games
-- would earn, so it can round a level up and can never be the level.

/**
 * Total XP needed to have reached a level.
 *
 * `25 * (L - 1) * L`. The increment between levels is `50 * (L - 1)`, so the
 * curve is the progression itself: every level asks for more than the last
 * one did, by a widening margin.
 */
create or replace function public.profile_level_threshold(level integer)
returns bigint language sql immutable set search_path = '' as $$
  select case when level <= 1 then 0 else 25::bigint * (level - 1) * level end
$$;

/**
 * The level that much XP buys, the exact inverse of the threshold above.
 *
 * `floor` on the positive root of 25L^2 - 25L - xp = 0. Solved rather than
 * looped, since this runs for every name on a page.
 */
create or replace function public.profile_level_for_xp(xp bigint)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor((1 + sqrt(1 + 0.16 * greatest(xp, 0))) / 2)::integer)
$$;

/** Most XP a library can contribute, however large it grows. */
create or replace function public.profile_library_xp_cap()
returns integer language sql immutable set search_path = '' as $$ select 100 $$;

drop function if exists public.profile_level(uuid);
create function public.profile_level(target uuid)
returns table (
  level integer,
  xp bigint,
  level_floor bigint,
  next_level_at bigint,
  sessions bigint,
  reviews bigint,
  journeys bigint,
  lists bigint,
  screenshots bigint,
  comments bigint,
  games bigint,
  games_scored bigint
)
language sql stable security definer set search_path = ''
as $$
  with counts as (
    select
      (select count(*) from public.diary_entries where profile_id = target) as sessions,
      (select count(*) from public.reviews where profile_id = target) as reviews,
      (select count(*) from public.journeys where profile_id = target) as journeys,
      (select count(*) from public.game_lists where profile_id = target) as lists,
      (select count(*) from public.screenshots where profile_id = target) as screenshots,
      -- Both kinds of comment, and neither counts once deleted: XP that
      -- survives the thing that earned it is a score, not a record of
      -- activity, and deleting a comment would then be a way to keep the
      -- points without keeping the words.
      (
        (select count(*) from public.content_comments
          where author_id = target and deleted_at is null)
        + (select count(*) from public.profile_comments
            where author_id = target and deleted_at is null)
      ) as comments,
      (select count(*) from public.user_games where profile_id = target) as games
  ),
  capped as (
    select
      counts.*,
      -- Reported alongside the raw count so the dialog can show both the
      -- library someone has and the part of it the level is standing on,
      -- rather than quietly scoring a different number than it displays.
      least(counts.games, public.profile_library_xp_cap()) as games_scored
    from counts
  ),
  scored as (
    select
      capped.*,
      capped.sessions * 10
        + capped.reviews * 25
        + capped.journeys * 12
        + capped.lists * 15
        + capped.screenshots * 8
        + capped.comments * 5
        + capped.games_scored * 1 as xp
    from capped
  )
  select
    public.profile_level_for_xp(scored.xp) as level,
    scored.xp,
    public.profile_level_threshold(public.profile_level_for_xp(scored.xp)) as level_floor,
    public.profile_level_threshold(public.profile_level_for_xp(scored.xp) + 1) as next_level_at,
    scored.sessions,
    scored.reviews,
    scored.journeys,
    scored.lists,
    scored.screenshots,
    scored.comments,
    scored.games,
    scored.games_scored
  from scored
$$;

revoke all on function public.profile_level(uuid) from public;
grant execute on function public.profile_level(uuid) to anon, authenticated;
grant execute on function public.profile_library_xp_cap() to anon, authenticated;

-- Rebuilt because it selects `profile_level(...).*` and would otherwise keep
-- the old column list.
create or replace function public.profile_levels(targets uuid[])
returns table (
  profile_id uuid,
  level integer,
  xp bigint,
  level_floor bigint,
  next_level_at bigint,
  sessions bigint,
  reviews bigint,
  journeys bigint,
  lists bigint,
  screenshots bigint,
  comments bigint,
  games bigint,
  games_scored bigint
)
language sql stable security definer set search_path = ''
as $$
  select target, standing.*
    from (select distinct unnest(targets) as target) as wanted,
         lateral public.profile_level(wanted.target) as standing
$$;

revoke all on function public.profile_levels(uuid[]) from public;
grant execute on function public.profile_levels(uuid[]) to anon, authenticated;
