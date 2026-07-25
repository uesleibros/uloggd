-- View history. One unified table records the games, profiles and lists a
-- signed-in user opens, so the app can show "recently viewed" and personalise
-- the home from what the viewer actually looks at.
--
-- It is a last-seen list, not an append log: one row per (viewer, content),
-- upserted so re-opening something just bumps viewed_at. Reads take the most
-- recent N per type. Writes go through record_content_view (security definer);
-- reads use RLS so a viewer only ever sees their own history.

create table if not exists public.content_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('game', 'profile', 'list')),
  game_igdb_id integer,
  game_slug text,
  target_profile_id uuid references public.profiles(id) on delete cascade,
  list_id uuid references public.game_lists(id) on delete cascade,
  viewed_at timestamptz(6) not null default now(),
  -- Exactly one reference is set, matching content_type.
  constraint content_views_ref_check check (
    (content_type = 'game'
      and game_igdb_id is not null
      and target_profile_id is null and list_id is null)
    or (content_type = 'profile'
      and target_profile_id is not null
      and game_igdb_id is null and list_id is null)
    or (content_type = 'list'
      and list_id is not null
      and game_igdb_id is null and target_profile_id is null)
  )
);

-- One row per viewer per content, so a view is an upsert (dedup by these).
create unique index if not exists content_views_game_uk
  on public.content_views (viewer_id, game_igdb_id)
  where content_type = 'game';
create unique index if not exists content_views_profile_uk
  on public.content_views (viewer_id, target_profile_id)
  where content_type = 'profile';
create unique index if not exists content_views_list_uk
  on public.content_views (viewer_id, list_id)
  where content_type = 'list';

-- Read path: most recent per type for a viewer.
create index if not exists content_views_recent_idx
  on public.content_views (viewer_id, content_type, viewed_at desc);

alter table public.content_views enable row level security;

grant select, insert, update, delete on public.content_views to authenticated;
grant all privileges on public.content_views to service_role;

-- A viewer only ever reads their own history.
create policy "content_views_own_read" on public.content_views
  for select to authenticated
  using (viewer_id = (select auth.uid()));
create policy "content_views_own_write" on public.content_views
  for all to authenticated
  using (viewer_id = (select auth.uid()))
  with check (viewer_id = (select auth.uid()));

-- Records (or bumps) a view. Called from the game/profile/list pages. Ignores
-- anonymous callers and self-profile views; the upsert keeps one row per item.
create or replace function public.record_content_view(
  p_type text,
  p_game_igdb_id integer default null,
  p_game_slug text default null,
  p_profile_id uuid default null,
  p_list_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := (select auth.uid());
begin
  if v_viewer is null then
    return;
  end if;

  if p_type = 'game' then
    if p_game_igdb_id is null then
      return;
    end if;
    insert into public.content_views (viewer_id, content_type, game_igdb_id, game_slug)
    values (v_viewer, 'game', p_game_igdb_id, p_game_slug)
    on conflict (viewer_id, game_igdb_id) where content_type = 'game'
    do update set viewed_at = now(), game_slug = excluded.game_slug;

  elsif p_type = 'profile' then
    -- Looking at your own profile is not history.
    if p_profile_id is null or p_profile_id = v_viewer then
      return;
    end if;
    insert into public.content_views (viewer_id, content_type, target_profile_id)
    values (v_viewer, 'profile', p_profile_id)
    on conflict (viewer_id, target_profile_id) where content_type = 'profile'
    do update set viewed_at = now();

  elsif p_type = 'list' then
    if p_list_id is null then
      return;
    end if;
    insert into public.content_views (viewer_id, content_type, list_id)
    values (v_viewer, 'list', p_list_id)
    on conflict (viewer_id, list_id) where content_type = 'list'
    do update set viewed_at = now();
  end if;
end;
$$;

grant execute on function public.record_content_view(
  text, integer, text, uuid, uuid
) to authenticated;
