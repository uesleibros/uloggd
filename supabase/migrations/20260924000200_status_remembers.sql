-- Turning a status off used to throw away what the game was.
--
-- The card has two toggles that write a status: "zerado" and "jogando".
-- Turning either one on replaced whatever the game was, and turning it off
-- sent the row to BACKLOG, because the interface had nothing else to say. So
-- a finished game marked as being played again came back as backlog, and the
-- fact it had ever been finished was gone from the row entirely.
--
-- Two changes. The row now remembers the status a toggle replaced, and a
-- toggle turned off restores it. And finishing a game stamps `completed_at`,
-- a column that has existed since the first migration and that nothing has
-- ever written: it is never cleared, so playing something again keeps the
-- record that it was once finished.

alter table public.user_games
  add column if not exists previous_status public."GameStatus";

-- Everything already finished gets the record it should have had. The date is
-- the row's own last update, which is the closest thing to a completion date
-- that exists for these.
update public.user_games
set completed_at = coalesce(completed_at, updated_at::date)
where status = 'COMPLETED' and completed_at is null;

/**
 * One quick action on a game card.
 *
 * `action_value` is what the toggle was set to. For a status it used to be
 * ignored, and an interface that wanted to turn one off had to name a
 * replacement, which is where BACKLOG came from. False now means "turn this
 * status off", and the row goes back to what it was before that status was
 * put on it.
 */
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

  select status, previous_status into current_status, remembered
  from public.user_games
  where profile_id = auth.uid() and igdb_id = game_id
  for update;

  -- Turning off a status the game no longer has is somebody else's click
  -- arriving late. The row is returned as it stands rather than moved.
  if clearing and current_status is distinct from game_status then
    select * into result from public.user_games
    where profile_id = auth.uid() and igdb_id = game_id;
    return result;
  end if;

  update public.user_games
  set
    status = case
      when clearing then coalesce(remembered, 'BACKLOG')
      when action_name = 'status' then game_status
      when action_name = 'playing' and action_value then 'PLAYING'
      when action_name = 'playing' and not action_value and status = 'PLAYING'
        then coalesce(remembered, 'BACKLOG')
      else status
    end,
    -- What the game was before this status went on it. Cleared as soon as it
    -- is handed back, so a second toggle does not restore something twice.
    previous_status = case
      when clearing then null
      when action_name = 'status' and game_status is distinct from current_status
        then current_status
      when action_name = 'playing' and action_value and current_status <> 'PLAYING'
        then current_status
      when action_name = 'playing' and not action_value then null
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
      when clearing then coalesce(remembered, 'BACKLOG') = 'PLAYING'
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
