-- Site-owned game scores come from one normalized rating per player/game in
-- user_games. Reviews already synchronize their normalized 0-100 score into
-- this column, so combining the two tables would double-count reviewers.

create index if not exists user_games_community_rating_idx
  on public.user_games (igdb_id)
  include (profile_id, quick_rating)
  where quick_rating is not null;

create or replace function public.get_community_game_ratings(game_ids integer[])
returns table (
  igdb_id integer,
  rating integer,
  rating_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    game.igdb_id,
    round(avg(game.quick_rating))::integer as rating,
    count(*)::bigint as rating_count
  from public.user_games game
  where game.quick_rating is not null
    and game.igdb_id = any(coalesce(game_ids, '{}'::integer[]))
    and cardinality(coalesce(game_ids, '{}'::integer[])) <= 200
    and not exists (
      select 1
      from public.profile_moderation_state moderation
      where moderation.profile_id = game.profile_id
        and (moderation.banned_until is null or moderation.banned_until > now())
    )
  group by game.igdb_id
$$;

revoke all on function public.get_community_game_ratings(integer[])
  from public;
grant execute on function public.get_community_game_ratings(integer[])
  to anon, authenticated;
