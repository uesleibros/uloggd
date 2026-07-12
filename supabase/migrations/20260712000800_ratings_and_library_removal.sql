create or replace function public.set_game_rating(
  game_id integer,
  game_slug text,
  rating integer
)
returns public.user_games
language plpgsql
security definer
set search_path = ''
as $$
declare result public.user_games;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if game_id <= 0 or game_slug is null or char_length(trim(game_slug)) not between 1 and 255 then
    raise exception 'invalid game' using errcode = '22023';
  end if;
  if rating not in (20, 40, 60, 80, 100) then
    raise exception 'invalid rating' using errcode = '22023';
  end if;

  insert into public.user_games (profile_id, igdb_id, game_slug, status, quick_rating)
  values (auth.uid(), game_id, trim(game_slug), 'BACKLOG', rating)
  on conflict (profile_id, igdb_id) do update set
    quick_rating = excluded.quick_rating,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.set_game_rating(integer, text, integer) from public, anon;
grant execute on function public.set_game_rating(integer, text, integer) to authenticated;

create or replace function public.remove_game_from_library(game_id integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare removed boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if game_id <= 0 then
    raise exception 'invalid game' using errcode = '22023';
  end if;

  delete from public.user_games
  where profile_id = auth.uid() and igdb_id = game_id;

  removed := found;
  return removed;
end;
$$;

revoke all on function public.remove_game_from_library(integer) from public, anon;
grant execute on function public.remove_game_from_library(integer) to authenticated;
