-- A game with one 100 was beating a game with four hundred 92s.
--
-- The community score was a plain average, which is the right number to show
-- somebody who asks "what did people give this" and the wrong one to sort a
-- catalogue by. With few votes an average is mostly noise: one person is a
-- whole opinion, and a game nobody has played sits at the top of every
-- ranking beside the ones everybody has.
--
-- So the average stays, exactly as it was, and a second number sits beside
-- it: the average pulled towards the site's own mean by how little is known.
--
--   weighted = (v / (v + m)) * R + (m / (v + m)) * C
--
--   R  this game's average          v  how many rated it
--   C  the mean across every rated game
--   m  how many votes it takes before a game speaks mostly for itself
--
-- `m` is 10 here. It is a judgement, not a discovery: on a site this size a
-- dozen people is a real opinion, and a hundred would drown every game that
-- is not already popular. It lives in one place so it can be argued with.
--
-- C is the mean of the game means rather than of every rating, so a game
-- with three thousand ratings does not set the baseline the other games are
-- pulled towards by itself.
--
-- Reviews are deliberately not mixed in. A review carries its own scale, and
-- five stars, an eight out of ten and a recommendation are not the same
-- measurement; averaging them together would produce a number nobody could
-- explain. The quick rating is the one scale everybody here shares.

create index if not exists user_games_rated_idx
  on public.user_games (igdb_id) include (quick_rating)
  where quick_rating is not null;

drop function if exists public.get_community_game_ratings(integer[]);
create function public.get_community_game_ratings(game_ids integer[])
returns table (
  igdb_id integer,
  rating integer,
  rating_count bigint,
  weighted_rating integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with rated as (
    select game.igdb_id, game.quick_rating
    from public.user_games game
    where game.quick_rating is not null
      and not exists (
        select 1
        from public.profile_moderation_state moderation
        where moderation.profile_id = game.profile_id
          and (moderation.banned_until is null
               or moderation.banned_until > now())
      )
  ),
  -- The mean of the game means, over the whole catalogue rather than over the
  -- games being asked about: a baseline that moved with the question would
  -- make two pages disagree about the same game.
  baseline as (
    select avg(game_mean) as centre from (
      select avg(quick_rating) as game_mean from rated group by igdb_id
    ) means
  )
  select
    asked.igdb_id,
    round(avg(asked.quick_rating))::integer,
    count(*)::bigint,
    round(
      (count(*)::numeric / (count(*) + 10))
        * avg(asked.quick_rating)
      + (10::numeric / (count(*) + 10))
        * coalesce((select centre from baseline), avg(asked.quick_rating))
    )::integer
  from rated asked
  where asked.igdb_id = any(coalesce(game_ids, '{}'::integer[]))
    and cardinality(coalesce(game_ids, '{}'::integer[])) <= 200
  group by asked.igdb_id
$$;

revoke all on function public.get_community_game_ratings(integer[]) from public;
grant execute on function public.get_community_game_ratings(integer[]) to anon, authenticated;
