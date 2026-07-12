alter table public.user_games
  add column if not exists quick_rating integer,
  add column if not exists custom_cover_url text,
  add constraint user_games_quick_rating_check check (quick_rating is null or quick_rating between 0 and 100),
  add constraint user_games_custom_cover_check check (custom_cover_url is null or (char_length(custom_cover_url) <= 2048 and custom_cover_url ~ '^https://'));

create or replace function public.set_game_quick_state(
  game_id integer,
  game_slug text,
  game_status public."GameStatus",
  rating integer default null,
  cover_url text default null
)
returns public.user_games
language plpgsql
security definer
set search_path = ''
as $$
declare result public.user_games;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or game_slug is null or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if rating is not null and rating not between 0 and 100 then raise exception 'invalid rating' using errcode = '22023'; end if;
  if cover_url is not null and (char_length(cover_url) > 2048 or cover_url !~ '^https://') then raise exception 'invalid cover url' using errcode = '22023'; end if;
  insert into public.user_games (profile_id, igdb_id, game_slug, status, quick_rating, custom_cover_url)
  values (auth.uid(), game_id, trim(game_slug), game_status, rating, nullif(trim(cover_url), ''))
  on conflict (profile_id, igdb_id) do update set
    status = excluded.status,
    quick_rating = excluded.quick_rating,
    custom_cover_url = excluded.custom_cover_url,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;
revoke all on function public.set_game_quick_state(integer,text,public."GameStatus",integer,text) from public, anon;
grant execute on function public.set_game_quick_state(integer,text,public."GameStatus",integer,text) to authenticated;
