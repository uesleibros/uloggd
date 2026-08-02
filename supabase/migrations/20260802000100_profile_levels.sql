-- A level beside the name, earned from what someone has actually logged.
--
-- The profile already knew how much work was behind it and showed none of it.
-- Counts sit in separate tabs, so a person who has logged four hundred sessions
-- and one who signed up yesterday read the same at a glance.
--
-- Everything here is derived from existing rows rather than kept in a column.
-- There is no ledger to drift out of step, no backfill for accounts that
-- predate this, and deleting a review takes its XP back without a trigger. The
-- cost is one aggregate per profile view, which is why the counts are indexed
-- and the function is called once per page rather than per component.

/**
 * What each kind of activity is worth.
 *
 * A single function so the numbers are stated once and the UI can read the same
 * table it is scored by. Values are deliberately far apart: a review is real
 * work and a library row is a tap.
 *
 * A library row is worth 1 because it can arrive in bulk. Scored at 2, the
 * account with 229 imported games and nothing else outranked the one with
 * sessions, a review, a list and a journey, which inverts the thing this is
 * supposed to measure. A large library still counts, it just no longer
 * outweighs having written something.
 */
create or replace function public.profile_xp_rates()
returns table (activity text, xp integer)
language sql immutable set search_path = '' as $$
  values
    ('SESSION', 10),
    ('REVIEW', 25),
    ('JOURNEY', 12),
    ('LIST', 15),
    ('SCREENSHOT', 8),
    ('GAME', 1)
$$;

/**
 * Total XP needed to have reached a level.
 *
 * `25 * L * (L + 1)`, so each level costs 50 XP more than the one before it.
 * Flat costs make the number meaningless at the top end (an active account
 * reaches level 250 and nobody can tell 250 from 240); a curve this shape puts
 * a first level within an evening and level 20 within a year of real use.
 */
create or replace function public.profile_level_threshold(level integer)
returns bigint language sql immutable set search_path = '' as $$
  select case when level <= 0 then 0 else 25::bigint * level * (level + 1) end
$$;

/**
 * The level that much XP buys, the inverse of the threshold above.
 *
 * Solved rather than looped: the closed form is exact for every value the
 * cast can represent, and a loop here would run once per profile on every
 * page. `floor` on the positive root of 25L^2 + 25L - xp = 0.
 */
create or replace function public.profile_level_for_xp(xp bigint)
returns integer language sql immutable set search_path = '' as $$
  select greatest(0, floor((sqrt(1 + 4 * greatest(xp, 0) / 25.0) - 1) / 2)::integer)
$$;

/**
 * A profile's level, its XP, and where it sits inside the current level.
 *
 * Definer because the level must not depend on who is looking. Counted with
 * the caller's own privileges it would drop when a viewer cannot see someone's
 * private library, and the same profile would show two different numbers to
 * two people, which reads as a bug rather than as privacy.
 *
 * Only totals leave this function. Knowing an account has logged 312 sessions
 * says nothing about which games they were, and those counts are already
 * visible in aggregate on the profile.
 */
create or replace function public.profile_level(target uuid)
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
  games bigint
)
language sql stable security definer set search_path = '' as $$
  with counts as (
    select
      (select count(*) from public.diary_entries where profile_id = target) as sessions,
      (select count(*) from public.reviews where profile_id = target) as reviews,
      (select count(*) from public.journeys where profile_id = target) as journeys,
      (select count(*) from public.game_lists where profile_id = target) as lists,
      (select count(*) from public.screenshots where profile_id = target) as screenshots,
      (select count(*) from public.user_games where profile_id = target) as games
  ),
  scored as (
    select
      counts.*,
      counts.sessions * 10
        + counts.reviews * 25
        + counts.journeys * 12
        + counts.lists * 15
        + counts.screenshots * 8
        + counts.games * 1 as xp
    from counts
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
    scored.games
  from scored
$$;

revoke all on function public.profile_level(uuid) from public;
grant execute on function public.profile_level(uuid) to anon, authenticated;
grant execute on function public.profile_xp_rates() to anon, authenticated;
grant execute on function public.profile_level_threshold(integer) to anon, authenticated;
grant execute on function public.profile_level_for_xp(bigint) to anon, authenticated;

-- The aggregate is six counts by `profile_id`; without these it is six
-- sequential scans on every profile view.
create index if not exists diary_entries_profile_idx on public.diary_entries (profile_id);
create index if not exists reviews_profile_idx on public.reviews (profile_id);
create index if not exists journeys_profile_idx on public.journeys (profile_id);
create index if not exists game_lists_profile_idx on public.game_lists (profile_id);
create index if not exists screenshots_profile_idx on public.screenshots (profile_id);
create index if not exists user_games_profile_idx on public.user_games (profile_id);
