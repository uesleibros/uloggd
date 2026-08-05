-- Finding people, built from the one thing this site has plenty of.
--
-- Fifty-nine follow edges across twenty-eight accounts. Three accounts
-- holding a hundred and forty-eight, a hundred and ten and eighty-nine games
-- have no followers and follow no one at all. That is not disinterest, it is
-- that the only way to reach a person here is to type a username you already
-- know: nothing on the site introduces anybody.
--
-- The libraries meanwhile are full, and that is the way out. Fourteen of the
-- nineteen share at least three games with somebody, six to thirteen people
-- each. So the introduction comes from the overlap rather than from the
-- follow graph, which is the part that is stuck.
--
-- Deliberately not "who else played this game": only a quarter of the games
-- here are in two libraries and none is in more than six, so that version
-- would be blank on three out of four game pages.

-- Ranked by cosine similarity, not by the raw count of shared games. The raw
-- count is mostly a measure of library size: across the fourteen lists it
-- named only six distinct people, one of them in thirteen of the fourteen,
-- which turns the shelf into an advertisement for one account. Cosine names
-- eleven different people over the same lists and still ranks a pair sharing
-- eleven games above one sharing a hundred and twenty.
--
-- `security invoker`, which is the whole privacy design. Row level security on
-- `user_games` already answers "may this viewer see this library", covering
-- private libraries and blocks in both directions, and it was written and
-- reviewed once. A `security definer` function here would have to restate all
-- of that from memory, and restating a privacy rule is how you get a version
-- that disagrees with the original.
create or replace function public.taste_neighbours(max_rows integer default 12)
returns table (
  profile_id uuid,
  shared_games integer,
  affinity real,
  -- Whether they already follow the viewer. Computed here rather than in a
  -- second query because it is the strongest thing the shelf can say — this
  -- person already found you — and the home page is not owed another round
  -- trip for one boolean.
  follows_viewer boolean
)
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
  ),
  my_size as (select count(*)::double precision as games from mine),
  -- One pass over the rows the viewer is allowed to read. Anything row level
  -- security hides never reaches the count, so a hidden library cannot be
  -- inferred from a number here either.
  overlap as (
    select game.profile_id, count(distinct game.igdb_id)::integer as shared
    from public.user_games game
    join mine on mine.igdb_id = game.igdb_id, viewer
    where game.profile_id <> viewer.id
    group by game.profile_id
    -- Three, because one shared game is not a taste, it is a bestseller.
    having count(distinct game.igdb_id) >= 3
  )
  select
    candidate.profile_id,
    candidate.shared,
    (
      candidate.shared / sqrt(
        (select games from my_size)
        * (
          select count(distinct other.igdb_id)::double precision
          from public.user_games other
          where other.profile_id = candidate.profile_id
        )
      )
    )::real,
    exists (
      select 1 from public.follows back
      where back.follower_id = candidate.profile_id
        and back.following_id = viewer.id
    )
  from overlap candidate
  join public.profiles person on person.id = candidate.profile_id, viewer
  where
    -- Half-registered accounts have no profile page to send anyone to.
    person.username is not null
    -- Followers-only profiles, and blocks, on the app's own definition.
    and public.profile_visible(candidate.profile_id)
    -- Suggesting somebody the viewer already follows wastes the row.
    and not exists (
      select 1 from public.follows edge
      where edge.follower_id = viewer.id
        and edge.following_id = candidate.profile_id
    )
    -- Nor somebody already asked, waiting on an answer.
    and not exists (
      select 1 from public.follow_requests pending
      where pending.requester_id = viewer.id
        and pending.target_id = candidate.profile_id
    )
  order by 3 desc, candidate.shared desc, person.username
  limit greatest(1, least(coalesce(max_rows, 12), 48))
$$;

comment on function public.taste_neighbours(integer) is
  'People whose library overlaps the caller''s, ranked by cosine similarity. '
  'Security invoker on purpose: row level security on user_games is what '
  'keeps private libraries and blocked accounts out of the result.';

-- Execute comes from PUBLIC unless it is taken away there; revoking from anon
-- alone would leave the grant exactly where it was.
revoke all on function public.taste_neighbours(integer) from public, anon;
grant execute on function public.taste_neighbours(integer) to authenticated;
