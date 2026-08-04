-- `playing` began as an independent quick-action boolean, then the interface
-- made PLAYING the single status that represents the same state. Status writes
-- did not clear the old boolean, so a game moved to BACKLOG could remain on the
-- Playing shelf forever. Repair existing rows and keep older clients using the
-- boolean action compatible with the status-based interface.
update public.user_games
set playing = (status = 'PLAYING')
where playing is distinct from (status = 'PLAYING');

-- Reads now use the existing (profile_id, status) index. Keeping a second
-- partial index on the legacy boolean would only add work to every write.
drop index if exists public.user_games_profile_playing_idx;

create or replace function public.set_game_card_action(
  game_id integer,
  game_slug text,
  action_name text,
  action_value boolean default null,
  game_status public."GameStatus" default null
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
  if action_name not in ('status', 'playing', 'backlog', 'wishlist', 'liked') then
    raise exception 'invalid action' using errcode = '22023';
  end if;
  if action_name = 'status' and game_status is null then
    raise exception 'status required' using errcode = '22023';
  end if;
  if action_name <> 'status' and action_value is null then
    raise exception 'value required' using errcode = '22023';
  end if;

  insert into public.user_games (profile_id, igdb_id, game_slug, status)
  values (auth.uid(), game_id, trim(game_slug), coalesce(game_status, 'BACKLOG'))
  on conflict (profile_id, igdb_id) do nothing;

  update public.user_games
  set
    status = case
      when action_name = 'status' then game_status
      when action_name = 'playing' and action_value then 'PLAYING'
      when action_name = 'playing' and not action_value and status = 'PLAYING' then 'BACKLOG'
      else status
    end,
    playing = case
      when action_name = 'status' then game_status = 'PLAYING'
      when action_name = 'playing' then action_value
      else playing
    end,
    backlog = case when action_name = 'backlog' then action_value else backlog end,
    wishlist = case when action_name = 'wishlist' then action_value else wishlist end,
    liked = case when action_name = 'liked' then action_value else liked end,
    updated_at = now()
  where profile_id = auth.uid() and igdb_id = game_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.set_game_card_action(integer, text, text, boolean, public."GameStatus") from public, anon;
grant execute on function public.set_game_card_action(integer, text, text, boolean, public."GameStatus") to authenticated;
