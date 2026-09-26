-- "Jogando" and "Jogado" are two different facts about one game.
--
-- `playing` has been a column of its own since the card actions were built,
-- but `set_game_card_action` kept deriving it from the status: any status
-- written to the row set `playing = (status = 'PLAYING')`. So marking a game
-- as played, shelved or abandoned turned off "playing" as a side effect, and
-- somebody replaying something they had finished could not say both.
--
-- They are separate answers to separate questions. `status` is where the game
-- stands with you; `playing` is whether you are playing it right now. A
-- replay is exactly the case where those two disagree, and it is not a rare
-- case.
--
-- `playing` now moves only when somebody says something about playing: the
-- `playing` action, or a status action naming 'PLAYING', which is what the
-- importer and every client written before this send to mean the same thing.
-- Every other status leaves the flag alone.

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
declare
  result public.user_games;
  current_status public."GameStatus";
  remembered public."GameStatus";
  clearing boolean := action_name = 'status' and action_value is false;
  -- Turning off a status the game no longer has: somebody else's click
  -- arriving late, or a client that still says "not playing" as a status.
  stale boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if game_id <= 0 or game_slug is null
     or char_length(trim(game_slug)) not between 1 and 255 then
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

  insert into public.user_games (profile_id, igdb_id, game_slug, status, playing)
  values (
    auth.uid(), game_id, trim(game_slug),
    case when action_name = 'status' and not coalesce(action_value, true)
      then 'BACKLOG' else coalesce(game_status, 'BACKLOG') end,
    coalesce(
      case
        when action_name = 'playing' then action_value
        when game_status = 'PLAYING' then coalesce(action_value, true)
        else false
      end,
      false
    )
  )
  on conflict (profile_id, igdb_id) do nothing;

  select status, previous_status into current_status, remembered
  from public.user_games
  where profile_id = auth.uid() and igdb_id = game_id
  for update;

  stale := clearing and current_status is distinct from game_status;
  -- A stale clear of any other status changes nothing. A stale clear of
  -- 'PLAYING' still means "I am not playing", and that flag no longer lives
  -- in the status, so it falls through to the update below.
  if stale and game_status <> 'PLAYING' then
    select * into result from public.user_games
    where profile_id = auth.uid() and igdb_id = game_id;
    return result;
  end if;

  update public.user_games
  set
    status = case
      when clearing and not stale then coalesce(remembered, 'BACKLOG')
      when action_name = 'status' and not clearing then game_status
      -- The playing flag no longer moves the status. It used to, which is
      -- what made the two impossible to hold at once.
      else status
    end,
    -- What the game was before this status went on it. Cleared as soon as it
    -- is handed back, so a second toggle does not restore something twice.
    previous_status = case
      when clearing and not stale then null
      when action_name = 'status' and not clearing
           and game_status is distinct from current_status
        then current_status
      else previous_status
    end,
    -- Stamped the first time a game is finished and never cleared: playing it
    -- again does not unmake having finished it.
    completed_at = case
      when completed_at is not null then completed_at
      when action_name = 'status' and not clearing and game_status = 'COMPLETED'
        then current_date
      else completed_at
    end,
    playing = case
      when action_name = 'playing' then action_value
      -- Only a status that names playing says anything about playing.
      when action_name = 'status' and game_status = 'PLAYING' then not clearing
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

-- Rows written before this could not disagree, since the flag was derived
-- from the status. This only catches anything written around the function.
update public.user_games set playing = true
where status = 'PLAYING' and not playing;
