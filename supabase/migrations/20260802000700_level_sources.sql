-- Rates below one across the board, and the breakdown comes from here.
--
-- A review was still a whole point while everything else was a fraction of
-- one, which made it the unit rather than one rate among several. Every rate
-- is under 1 now and they are spread out rather than clustered: a review 0.6,
-- a journey 0.5, a list 0.4, a session and a screenshot 0.3, a comment 0.2, a
-- library game 0.1.
--
-- Tenths rather than quarters, because quarters could only express four
-- values below one and three of the seven rates had to share. Still integers
-- all the way through, so nobody is shown a total of 6.9 that was scored as 6.
--
-- The other half of this migration is that `profile_level` now returns the
-- breakdown it scored. The interface used to keep its own copy of the rates to
-- render the dialog, and that copy went stale twice in one day: the numbers
-- were rebalanced and the dialog kept explaining the previous scheme. A test
-- caught it both times, which is the point at which the duplication should
-- stop rather than be watched. There is one definition now and the dialog
-- prints what it is given.

/**
 * What each activity is worth, in tenths of a point.
 *
 * The single definition. `profile_level` reads this rather than repeating the
 * numbers, so a rate changes in one place.
 */
drop function if exists public.profile_xp_rates();
create function public.profile_xp_rates()
returns table (activity text, tenths integer)
language sql immutable set search_path = '' as $$
  values
    ('REVIEW', 6),
    ('JOURNEY', 5),
    ('LIST', 4),
    ('SESSION', 3),
    ('SCREENSHOT', 3),
    -- The two cheapest things to produce here, and the two easiest to produce
    -- in bulk: worth having, not worth farming.
    ('COMMENT', 2),
    ('GAME', 1)
$$;

grant execute on function public.profile_xp_rates() to anon, authenticated;

/** How many tenths make one XP. */
create or replace function public.profile_xp_tenths()
returns integer language sql immutable set search_path = '' as $$ select 10 $$;

/**
 * Total XP needed to have reached a level.
 *
 * `2 * (L - 1) * L`, so each level costs 4 more than the last: 4 to reach
 * level 2, then 8, then 12. The increment is the progression.
 */
create or replace function public.profile_level_threshold(level integer)
returns bigint language sql immutable set search_path = '' as $$
  select case when level <= 1 then 0 else 2::bigint * (level - 1) * level end
$$;

/**
 * The level that much XP buys: the positive root of 2L^2 - 2L - xp = 0.
 *
 * Kept as `(2 + sqrt(4 + 8x)) / 4` rather than the reduced form, so everything
 * under the root is an integer. The reduced version of the previous curve
 * multiplied by an inexact `4.0/3.0` and returned the level below the one it
 * should at exactly 126 XP.
 */
create or replace function public.profile_level_for_xp(xp bigint)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor((2 + sqrt(4 + 8 * greatest(xp, 0))) / 4)::integer)
$$;

drop function if exists public.profile_level(uuid);
/**
 * A profile's standing, including the breakdown that produced it.
 *
 * `sources` is ordered by what the activity is worth, so the dialog lists the
 * ways of earning XP from most to least without deciding that order itself.
 * Each entry carries the raw count, the count that was actually scored (they
 * differ only for a capped library) and the tenths it contributed.
 */
create function public.profile_level(target uuid)
returns table (
  level integer,
  xp bigint,
  level_floor bigint,
  next_level_at bigint,
  sources jsonb
)
language sql stable security definer set search_path = ''
as $$
  with counts as (
    select
      (select count(*) from public.reviews where profile_id = target) as reviews,
      (select count(*) from public.journeys where profile_id = target) as journeys,
      (select count(*) from public.game_lists where profile_id = target) as lists,
      (select count(*) from public.diary_entries where profile_id = target) as sessions,
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
  -- One row per activity, so the rate is looked up rather than written out
  -- again next to each count.
  entries as (
    select
      rate.activity,
      counted.total,
      -- A library is capped; nothing else is. Kept as a separate column so the
      -- dialog can say "12 of 1006" instead of quietly showing the smaller
      -- number as though it were the whole library.
      case
        when rate.activity = 'GAME'
        then least(counted.total, public.profile_library_xp_cap())
        else counted.total
      end as scored,
      rate.tenths
    from public.profile_xp_rates() as rate
    join lateral (
      select case rate.activity
        when 'REVIEW' then counts.reviews
        when 'JOURNEY' then counts.journeys
        when 'LIST' then counts.lists
        when 'SESSION' then counts.sessions
        when 'SCREENSHOT' then counts.screenshots
        when 'COMMENT' then counts.comments
        when 'GAME' then counts.games
      end as total
      from counts
    ) as counted on true
  ),
  scored as (
    select
      -- Summed in tenths and divided once, rather than rounding each activity
      -- on its own: at these rates four lists would floor to nothing while the
      -- fifth was suddenly worth two.
      --
      -- Cast before dividing. `sum()` over bigint returns numeric, and numeric
      -- division keeps the decimals, so the total would stop being floored and
      -- would not match the type the level functions take.
      sum(entries.scored * entries.tenths)::bigint / public.profile_xp_tenths() as xp,
      jsonb_agg(
        jsonb_build_object(
          'activity', entries.activity,
          'count', entries.total,
          'scored', entries.scored,
          'tenths', entries.tenths,
          'earned_tenths', entries.scored * entries.tenths
        )
        order by entries.tenths desc, entries.activity
      ) as sources
    from entries
  )
  select
    public.profile_level_for_xp(scored.xp) as level,
    scored.xp,
    public.profile_level_threshold(public.profile_level_for_xp(scored.xp)) as level_floor,
    public.profile_level_threshold(public.profile_level_for_xp(scored.xp) + 1) as next_level_at,
    scored.sources
  from scored
$$;

revoke all on function public.profile_level(uuid) from public;
grant execute on function public.profile_level(uuid) to anon, authenticated;
grant execute on function public.profile_xp_tenths() to anon, authenticated;

-- Rebuilt for the new column list, which it selects with `standing.*`.
drop function if exists public.profile_levels(uuid[]);
create function public.profile_levels(targets uuid[])
returns table (
  profile_id uuid,
  level integer,
  xp bigint,
  level_floor bigint,
  next_level_at bigint,
  sources jsonb
)
language sql stable security definer set search_path = ''
as $$
  select target, standing.*
    from (select distinct unnest(targets) as target) as wanted,
         lateral public.profile_level(wanted.target) as standing
$$;

revoke all on function public.profile_levels(uuid[]) from public;
grant execute on function public.profile_levels(uuid[]) to anon, authenticated;
