-- The overview had the leak the policy just lost, and no way to ask about one.
--
-- `journey_overview` is `security definer`, so it answers on its own terms
-- rather than through `journeys_read`. Closing the policy left this open: a
-- run whose every session is private still came back, title and all, with
-- zero minutes beside it. A definer function that reads a table has to carry
-- that table's rule itself, which is the same lesson `diary_entry_visible`
-- taught while the playlog was being built.
--
-- It also only ever answered "all the runs of this person". A page about one
-- run had to read the columns itself and add the sums up in the browser,
-- which is the thing this function exists to stop.

-- Dropped first, not replaced: a parameter added to a function makes a second
-- function rather than a new version of the first, and both would then match
-- `journey_overview(owner => ...)`, which answers "function is not unique".
drop function if exists public.journey_overview(uuid, integer, integer, integer);

create or replace function public.journey_overview(
  owner uuid,
  game_id integer default null,
  page_limit integer default 24,
  page_offset integer default 0,
  target uuid default null
)
returns table (
  id uuid,
  public_id text,
  igdb_id integer,
  game_slug varchar,
  title varchar,
  status text,
  started_on date,
  finished_on date,
  replay boolean,
  mastered boolean,
  difficulty varchar,
  progress varchar,
  created_at timestamptz,
  updated_at timestamptz,
  minutes bigint,
  sessions bigint,
  last_played date,
  review_public_id text,
  review_rating integer,
  copy_id uuid,
  copy_platform_id integer,
  copy_platform_name varchar,
  copy_storefront text,
  copy_ownership text,
  copy_medium text,
  copy_edition varchar
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    j.id, j.public_id, j.igdb_id, j.game_slug, j.title, j.status,
    j.started_on, j.finished_on, j.replay, j.mastered, j.difficulty,
    j.progress, j.created_at, j.updated_at,
    coalesce(sum(e.minutes), 0)::bigint,
    count(e.id)::bigint,
    max(e.played_on),
    max(r.public_id), max(r.rating),
    c.id, c.platform_id, c.platform_name, c.storefront, c.ownership,
    c.medium, c.edition
  from public.journeys j
  left join public.diary_entries e
    on e.journey_id = j.id
   and e.open_since is null
   and (
     e.visibility = 'PUBLIC'
     or e.profile_id = auth.uid()
     or (e.visibility = 'FOLLOWERS' and exists(
       select 1 from public.follows
       where follower_id = auth.uid() and following_id = e.profile_id
     ))
   )
  left join public.reviews r
    on r.journey_id = j.id
   and (
     r.visibility = 'PUBLIC'
     or r.profile_id = auth.uid()
     or (r.visibility = 'FOLLOWERS' and exists(
       select 1 from public.follows
       where follower_id = auth.uid() and following_id = r.profile_id
     ))
   )
  -- The copy is only ever shown to somebody who could read it directly.
  left join public.library_entries c
    on c.id = j.library_entry_id
   and (
     c.profile_id = auth.uid()
     or exists(
       select 1 from public.profiles p
       where p.id = c.profile_id
         and (
           p.library_visibility = 'PUBLIC'
           or (p.library_visibility = 'FOLLOWERS' and exists(
             select 1 from public.follows f
             where f.following_id = p.id and f.follower_id = auth.uid()
           ))
         )
     )
   )
  where j.profile_id = owner
    and not public.viewer_blocked_with(j.profile_id)
    and (game_id is null or j.igdb_id = game_id)
    and (target is null or j.id = target)
    -- The same rule `journeys_read` holds: a run is as visible as what is
    -- inside it, and always visible to its author.
    and (
      j.profile_id = auth.uid()
      or exists(
        select 1 from public.diary_entries visible
        where visible.journey_id = j.id
          and visible.open_since is null
          and (
            visible.visibility = 'PUBLIC'
            or (visible.visibility = 'FOLLOWERS' and exists(
              select 1 from public.follows
              where follower_id = auth.uid() and following_id = j.profile_id
            ))
          )
      )
    )
  group by j.id, c.id
  order by max(e.played_on) desc nulls last, j.created_at desc
  limit greatest(1, least(coalesce(page_limit, 24), 100))
  offset greatest(0, coalesce(page_offset, 0))
$$;

revoke all on function public.journey_overview(uuid, integer, integer, integer, uuid) from public;
grant execute on function public.journey_overview(uuid, integer, integer, integer, uuid) to anon, authenticated;

/**
 * The copies of one game that the caller owns.
 *
 * Their own only. Somebody else's copies read through the table, which has a
 * policy for exactly that, and this is the list an editor offers you to pick
 * from, which is never anybody else's.
 */
create or replace function public.own_library_entries(game_id integer default null)
returns setof public.library_entries
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.library_entries
  where profile_id = auth.uid()
    and (game_id is null or igdb_id = game_id)
  order by created_at
$$;

revoke all on function public.own_library_entries(integer) from public, anon;
grant execute on function public.own_library_entries(integer) to authenticated;

/** A copy that no run points at and nobody wants any more. */
create or replace function public.delete_library_entry(entry uuid)
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
  -- The journeys pointing at it keep their runs and lose the platform, which
  -- is the honest state: the run happened, the copy is no longer recorded.
  update public.journeys set library_entry_id = null, updated_at = now()
  where library_entry_id = entry and profile_id = auth.uid();

  delete from public.library_entries
  where id = entry and profile_id = auth.uid();
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.delete_library_entry(uuid) from public, anon;
grant execute on function public.delete_library_entry(uuid) to authenticated;
