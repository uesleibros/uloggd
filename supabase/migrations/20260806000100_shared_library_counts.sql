-- How many games the caller shares with each of a given set of people.
--
-- `taste_neighbours` already computes this, but only for the twelve it decided
-- to suggest, and it deliberately drops anybody the caller already follows.
-- That is right for a shelf of introductions and wrong everywhere else: the
-- search results and the connection lists show people the shelf will never
-- name, and "eleven games in common" is the most useful thing that can be said
-- about a stranger on this site.
--
-- `security invoker`, for the same reason and with the same weight as the
-- other one: the count is itself a statement about a library, so row level
-- security on `user_games` has to be what decides whether it may be made. A
-- definer function here would have to restate every visibility rule from
-- memory, and a restated privacy rule is a privacy rule that will disagree
-- with the original.
create or replace function public.shared_library_counts(targets uuid[])
returns table (profile_id uuid, shared_games integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as (select auth.uid() as id),
  mine as (
    select distinct game.igdb_id
    from public.user_games game, viewer
    where game.profile_id = viewer.id
  )
  select other.profile_id, count(distinct other.igdb_id)::integer
  from public.user_games other
  join mine on mine.igdb_id = other.igdb_id, viewer
  where other.profile_id = any(targets)
    and other.profile_id <> viewer.id
  group by other.profile_id
$$;

comment on function public.shared_library_counts(uuid[]) is
  'Games the caller has in common with each given profile. Security invoker: '
  'row level security on user_games decides whose library may be counted.';

-- Execute is inherited from PUBLIC unless it is taken away there, so revoking
-- from anon alone would leave the grant exactly where it was.
revoke all on function public.shared_library_counts(uuid[]) from public, anon;
grant execute on function public.shared_library_counts(uuid[]) to authenticated;
