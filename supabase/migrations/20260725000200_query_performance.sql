-- Indexes matched to the application's hottest Supabase read paths. These
-- keep keyset shelves, counts and social feeds on narrow index scans as the
-- tables grow instead of falling back to broad scans and sorts.

create index if not exists user_games_profile_updated_idx
  on public.user_games (profile_id, updated_at desc);
create index if not exists user_games_profile_playing_idx
  on public.user_games (profile_id)
  where playing = true;
create index if not exists user_games_profile_rated_idx
  on public.user_games (profile_id)
  where quick_rating is not null;

create index if not exists reviews_profile_created_idx
  on public.reviews (profile_id, created_at desc);
create index if not exists reviews_public_created_idx
  on public.reviews (created_at desc)
  where visibility = 'PUBLIC';

create index if not exists diary_entries_profile_created_idx
  on public.diary_entries (profile_id, created_at desc);
create index if not exists diary_entries_game_created_idx
  on public.diary_entries (igdb_id, created_at desc);
create index if not exists diary_entries_public_created_idx
  on public.diary_entries (created_at desc)
  where visibility = 'PUBLIC';

create index if not exists screenshots_public_live_created_idx
  on public.screenshots (created_at desc)
  where visibility = 'PUBLIC' and deleted_at is null;

create index if not exists game_lists_profile_visibility_updated_idx
  on public.game_lists (profile_id, visibility, updated_at desc);
create index if not exists follows_follower_created_idx
  on public.follows (follower_id, created_at desc);
create index if not exists profiles_discovery_created_idx
  on public.profiles (created_at desc)
  where username is not null;

-- A list card needs its total size and at most five covers. Returning that
-- compact shape avoids transferring every item in every list preview.
create or replace function public.get_list_preview_items(
  target_lists uuid[],
  items_per_list integer default 5
)
returns table (
  list_id uuid,
  igdb_id integer,
  item_position integer,
  item_count bigint
)
language sql
stable
set search_path = ''
as $$
  with ranked as (
    select
      item.list_id,
      item.igdb_id,
      item.position,
      count(*) over (partition by item.list_id) as item_count,
      row_number() over (
        partition by item.list_id
        order by item.position, item.id
      ) as item_rank
    from public.game_list_items as item
    where item.list_id = any(target_lists)
  )
  select ranked.list_id, ranked.igdb_id, ranked.position as item_position, ranked.item_count
  from ranked
  where ranked.item_rank <= greatest(1, least(items_per_list, 20))
  order by ranked.list_id, ranked.position;
$$;

grant execute on function public.get_list_preview_items(uuid[], integer)
  to anon, authenticated, service_role;
