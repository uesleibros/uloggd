-- One pass over the counts instead of seven.
--
-- `profile_level` read the rate table and, for each of its seven rows, ran a
-- correlated lateral against the counts CTE. Postgres evaluated that CTE once
-- per rate row, so eight cheap counts became fifty-six and the function took
-- about 8ms warm. That is decoration on a name, called once per profile on a
-- page: a feed of thirty comments spent a quarter of a second deciding what
-- number to draw in a circle.
--
-- The counts are taken once and unpivoted into rows, which then join the rate
-- table by name. Same single source for the rates, same output, one pass.

create or replace function public.profile_level(target uuid)
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
      -- earned it is a score, not a record of activity.
      (
        (select count(*) from public.content_comments
          where author_id = target and deleted_at is null)
        + (select count(*) from public.profile_comments
            where author_id = target and deleted_at is null)
      ) as comments,
      (select count(*) from public.user_games where profile_id = target) as games
  ),
  -- One row per activity, from the single evaluation above.
  tallied as (
    select tally.activity, tally.total
      from counts,
           lateral (values
             ('REVIEW', counts.reviews),
             ('JOURNEY', counts.journeys),
             ('LIST', counts.lists),
             ('SESSION', counts.sessions),
             ('SCREENSHOT', counts.screenshots),
             ('COMMENT', counts.comments),
             ('GAME', counts.games)
           ) as tally(activity, total)
  ),
  entries as (
    select
      rate.activity,
      tallied.total,
      -- A library is capped; nothing else is. Kept beside the raw count so the
      -- dialog can say "12 of 1006" rather than showing the smaller number as
      -- though it were the whole library.
      case
        when rate.activity = 'GAME'
        then least(tallied.total, public.profile_library_xp_cap())
        else tallied.total
      end as scored,
      rate.tenths
    from public.profile_xp_rates() as rate
    join tallied on tallied.activity = rate.activity
  ),
  scored as (
    select
      -- Summed in tenths and divided once. Cast before dividing: `sum()` over
      -- bigint returns numeric, and numeric division would keep the decimals.
      sum(entries.scored * entries.tenths)::bigint
        / public.profile_xp_tenths() as xp,
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
