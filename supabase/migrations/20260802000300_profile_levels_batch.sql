-- Levels for a page full of names, in one round trip.
--
-- The badge only lived on the profile, where one aggregate per page was fine.
-- It belongs wherever the verified mark appears, and a feed of thirty posts
-- calling the single-profile function thirty times is thirty aggregates over
-- seven tables. This answers for a whole page at once.
--
-- Same definer reasoning as `profile_level`: the number must not depend on who
-- is looking, or the same account reads differently in two places on one
-- screen.

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
  games bigint
)
language sql stable security definer set search_path = ''
as $$
  -- Distinct because a feed repeats authors, and the caller should not have to
  -- deduplicate a list it assembled by walking rows.
  select target, standing.*
    from (select distinct unnest(targets) as target) as wanted,
         lateral public.profile_level(wanted.target) as standing
$$;

revoke all on function public.profile_levels(uuid[]) from public;
grant execute on function public.profile_levels(uuid[]) to anon, authenticated;
