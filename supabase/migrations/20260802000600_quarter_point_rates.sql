-- Every rate on the same small scale, not just the library.
--
-- The library was moved to a quarter of a point and the rest were left where
-- they were, so a review at 5 was worth twenty games and the numbers still
-- read as inflated next to it. Everything comes down by the same factor: a
-- review is 1, a journey and a list 0.75, a session and a screenshot 0.5, a
-- comment and a library game 0.25.
--
-- Scored in quarter points and divided once at the end, rather than rounding
-- each activity on its own. Rounding per activity has a cliff nobody would
-- accept: three lists at 0.75 each would floor to zero and earn nothing at
-- all, while the fourth would suddenly be worth three. Summing first means
-- partial progress in one place is finished off by activity in another, which
-- is how someone would expect it to work.
--
-- The library cap has to come down with them too. Forty games was two
-- reviews' worth at the old rates and would be ten at these, which would put
-- an account with a large import and nothing else within reach of one that
-- writes. Twelve games, three points, three reviews' worth.
--
-- The curve comes down with the rates, so the climb stays where it was rather
-- than silently becoming five times longer: each level costs 6 more quarters
-- than the last. Level 10 is 270 XP, which is 270 reviews or 540 sessions.

/**
 * What each activity is worth, in quarter points.
 *
 * Quarters rather than fractions because fractional XP would show someone a
 * total of 193.75 and then have to round it for display, which means the
 * number shown and the number scored stop being the same one. Four quarters
 * make a point; the interface divides by four to print the rate.
 */
drop function if exists public.profile_xp_rates();
create function public.profile_xp_rates()
returns table (activity text, quarters integer)
language sql immutable set search_path = '' as $$
  values
    ('REVIEW', 4),
    ('JOURNEY', 3),
    ('LIST', 3),
    ('SESSION', 2),
    ('SCREENSHOT', 2),
    -- The two cheapest things to produce here, and the two easiest to produce
    -- in bulk: worth having, not worth farming.
    ('COMMENT', 1),
    ('GAME', 1)
$$;

grant execute on function public.profile_xp_rates() to anon, authenticated;

/**
 * Most of a library that counts, in games.
 *
 * Kept as a count rather than as an XP ceiling so the dialog can say "12 of
 * 1006" and mean it; at a quarter each that is three points.
 */
create or replace function public.profile_library_xp_cap()
returns integer language sql immutable set search_path = '' as $$ select 12 $$;

/** How many quarter points make one XP. */
create or replace function public.profile_xp_quarters()
returns integer language sql immutable set search_path = '' as $$ select 4 $$;

/**
 * Total XP needed to have reached a level.
 *
 * `3 * (L - 1) * L`, so each level costs 6 more than the last: 6 to reach
 * level 2, then 12, then 18. The increment is the progression.
 */
create or replace function public.profile_level_threshold(level integer)
returns bigint language sql immutable set search_path = '' as $$
  select case when level <= 1 then 0 else 3::bigint * (level - 1) * level end
$$;

/**
 * The level that much XP buys: the positive root of 3L^2 - 3L - xp = 0.
 *
 * Written as `(3 + sqrt(9 + 12x)) / 6` rather than the reduced
 * `(1 + sqrt(1 + 4x/3)) / 2`, so everything under the root is an integer.
 * The reduced form multiplies by an inexact `4.0/3.0`: at exactly 126 XP it
 * produced 168.99999999999997, whose root fell a hair under 13, and the level
 * came back as 6 on the precise threshold for 7. Found by the test that walks
 * both sides of every boundary.
 */
create or replace function public.profile_level_for_xp(xp bigint)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor((3 + sqrt(9 + 12 * greatest(xp, 0))) / 6)::integer)
$$;

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
      -- Neither kind counts once deleted: XP that survives the thing that
      -- earned it is a score, not a record of activity, and deleting would be
      -- a way to keep the points without keeping the words.
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
      -- Reported next to the raw count so the dialog can show the library
      -- someone has and the part of it the level stands on, rather than
      -- scoring one number and displaying another.
      least(counts.games, public.profile_library_xp_cap()) as games_scored
    from counts
  ),
  scored as (
    select
      capped.*,
      (
        capped.reviews * 4
        + capped.journeys * 3
        + capped.lists * 3
        + capped.sessions * 2
        + capped.screenshots * 2
        + capped.comments * 1
        + capped.games_scored * 1
      ) / public.profile_xp_quarters() as xp
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
grant execute on function public.profile_xp_quarters() to anon, authenticated;
