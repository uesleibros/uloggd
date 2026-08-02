-- Smaller numbers, and a library measured in quarters.
--
-- The rates were inflated: a single review paid 25 and a session 10, so the XP
-- total ran ahead of anything it described and the only way to keep levelling
-- hard was to push the thresholds up to match. Both halves shrink here. A
-- review is 5, a session 2, a comment 1, and a level costs 20 more than the
-- one before it.
--
-- The library cap comes down with them. At a hundred games it was still worth
-- five reviews, and the account with the largest imported library was topping
-- the site over the one that actually writes. Forty games, ten points, two
-- reviews' worth: enough to notice, not enough to place.
--
-- A library game is worth a quarter of a point, which needs the rate table to
-- say how many of a thing make one unit rather than assuming one always does.
-- Fractional XP was the alternative and it is worse: nobody wants to read that
-- they have 193.75 XP, and rounding it for display would mean the number shown
-- and the number scored are different again.
--
-- Harder than before at every level. Level 10 is 900 XP, which is 180 reviews
-- or 450 sessions, and level 20 is 3800. The first two levels still arrive
-- quickly, because a ring that has never moved teaches people to stop looking
-- at it.

create or replace function public.profile_library_xp_cap()
returns integer language sql immutable set search_path = '' as $$ select 40 $$;

/**
 * What each activity is worth, and how many of it make that much.
 *
 * `per` exists for the library: a game is a quarter of a point, expressed as
 * one point per four games so the arithmetic stays in integers all the way to
 * the screen. Everything else is one for one.
 */
drop function if exists public.profile_xp_rates();
create function public.profile_xp_rates()
returns table (activity text, xp integer, per integer)
language sql immutable set search_path = '' as $$
  values
    ('REVIEW', 5, 1),
    ('JOURNEY', 3, 1),
    ('LIST', 3, 1),
    ('SESSION', 2, 1),
    ('SCREENSHOT', 2, 1),
    -- The cheapest thing to produce here and the easiest to produce in bulk,
    -- so it is worth having and not worth farming.
    ('COMMENT', 1, 1),
    -- A quarter each, and capped besides. Importing is not participating.
    ('GAME', 1, 4)
$$;

grant execute on function public.profile_xp_rates() to anon, authenticated;

/**
 * Total XP needed to have reached a level.
 *
 * `10 * (L - 1) * L`, so each level costs 20 more than the last and the
 * increment is itself the progression. 20 to reach level 2, then 40, then 60.
 */
create or replace function public.profile_level_threshold(level integer)
returns bigint language sql immutable set search_path = '' as $$
  select case when level <= 1 then 0 else 10::bigint * (level - 1) * level end
$$;

/** The level that much XP buys: the positive root of 10L^2 - 10L - xp = 0. */
create or replace function public.profile_level_for_xp(xp bigint)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor((1 + sqrt(1 + 0.4 * greatest(xp, 0))) / 2)::integer)
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
      capped.reviews * 5
        + capped.journeys * 3
        + capped.lists * 3
        + capped.sessions * 2
        + capped.screenshots * 2
        + capped.comments * 1
        -- Integer division on purpose: four games make a point and three make
        -- none, which is the same rule the dialog states.
        + capped.games_scored / 4 as xp
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
