create extension if not exists "pgcrypto";

create type public."GameStatus" as enum ('WISHLIST', 'BACKLOG', 'PLAYING', 'COMPLETED', 'DROPPED', 'ON_HOLD');
create type public."Visibility" as enum ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
create type public."ReportReason" as enum ('HARASSMENT', 'HATE_SPEECH', 'SPAM', 'IMPERSONATION', 'SEXUAL_CONTENT', 'CHILD_SAFETY', 'SELF_HARM', 'VIOLENCE', 'PRIVACY', 'OTHER');
create type public."ReportStatus" as enum ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(32) unique,
  display_name varchar(80),
  bio varchar(500),
  avatar_url text,
  locale varchar(10) not null default 'pt-BR',
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now()
);

create table public.user_games (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  igdb_id integer not null,
  game_slug varchar(255) not null,
  status public."GameStatus" not null default 'BACKLOG',
  progress integer,
  playtime_minutes integer not null default 0,
  liked boolean not null default false,
  favorite boolean not null default false,
  started_at date,
  completed_at date,
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  constraint user_games_profile_id_igdb_id_key unique (profile_id, igdb_id),
  constraint user_games_progress_check check (progress is null or progress between 0 and 100),
  constraint user_games_playtime_check check (playtime_minutes >= 0)
);
create index user_games_profile_id_status_idx on public.user_games(profile_id, status);
create index user_games_igdb_id_idx on public.user_games(igdb_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  igdb_id integer not null,
  game_slug varchar(255) not null,
  rating integer not null,
  content text,
  contains_spoilers boolean not null default false,
  visibility public."Visibility" not null default 'PUBLIC',
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  constraint reviews_profile_id_igdb_id_key unique (profile_id, igdb_id),
  constraint reviews_rating_check check (rating between 0 and 100)
);
create index reviews_igdb_id_created_at_idx on public.reviews(igdb_id, created_at);

create table public.game_lists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(100) not null,
  description varchar(500),
  visibility public."Visibility" not null default 'PUBLIC',
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now()
);
create index game_lists_profile_id_updated_at_idx on public.game_lists(profile_id, updated_at);

create table public.game_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.game_lists(id) on delete cascade,
  igdb_id integer not null,
  game_slug varchar(255) not null,
  position integer not null default 0,
  note varchar(300),
  created_at timestamptz(6) not null default now(),
  constraint game_list_items_list_id_igdb_id_key unique (list_id, igdb_id)
);
create index game_list_items_list_id_position_idx on public.game_list_items(list_id, position);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz(6) not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_check check (follower_id <> following_id)
);
create index follows_following_id_created_at_idx on public.follows(following_id, created_at);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz(6) not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self_check check (blocker_id <> blocked_id)
);
create index blocks_blocked_id_idx on public.blocks(blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid references public.profiles(id) on delete set null,
  content_type varchar(40),
  content_id uuid,
  reason public."ReportReason" not null,
  details varchar(1000),
  status public."ReportStatus" not null default 'OPEN',
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now()
);
create index reports_status_created_at_idx on public.reports(status, created_at);
create index reports_target_profile_id_idx on public.reports(target_profile_id);

grant usage on type public."GameStatus", public."Visibility", public."ReportReason", public."ReportStatus" to anon, authenticated, service_role;
grant select on public.profiles, public.reviews, public.game_lists, public.game_list_items, public.follows to anon;
grant select, insert, update, delete on public.profiles, public.user_games, public.reviews, public.game_lists, public.game_list_items, public.follows, public.blocks, public.reports to authenticated;
grant all privileges on public.profiles, public.user_games, public.reviews, public.game_lists, public.game_list_items, public.follows, public.blocks, public.reports to service_role;

alter table public.profiles enable row level security;
alter table public.user_games enable row level security;
alter table public.reviews enable row level security;
alter table public.game_lists enable row level security;
alter table public.game_list_items enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy "profiles_public_read" on public.profiles for select to anon, authenticated using (true);
create policy "profiles_owner_insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_owner_update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "user_games_owner_all" on public.user_games for all to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

create policy "reviews_public_read" on public.reviews for select to anon, authenticated using (visibility = 'PUBLIC' or (select auth.uid()) = profile_id);
create policy "reviews_owner_insert" on public.reviews for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "reviews_owner_update" on public.reviews for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "reviews_owner_delete" on public.reviews for delete to authenticated using ((select auth.uid()) = profile_id);

create policy "game_lists_public_read" on public.game_lists for select to anon, authenticated using (visibility = 'PUBLIC' or (select auth.uid()) = profile_id);
create policy "game_lists_owner_insert" on public.game_lists for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "game_lists_owner_update" on public.game_lists for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "game_lists_owner_delete" on public.game_lists for delete to authenticated using ((select auth.uid()) = profile_id);

create policy "game_list_items_visible_read" on public.game_list_items for select to anon, authenticated using (exists (select 1 from public.game_lists where game_lists.id = list_id and (game_lists.visibility = 'PUBLIC' or game_lists.profile_id = (select auth.uid()))));
create policy "game_list_items_owner_insert" on public.game_list_items for insert to authenticated with check (exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.profile_id = (select auth.uid())));
create policy "game_list_items_owner_update" on public.game_list_items for update to authenticated using (exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.profile_id = (select auth.uid()))) with check (exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.profile_id = (select auth.uid())));
create policy "game_list_items_owner_delete" on public.game_list_items for delete to authenticated using (exists (select 1 from public.game_lists where game_lists.id = list_id and game_lists.profile_id = (select auth.uid())));

create policy "follows_public_read" on public.follows for select to anon, authenticated using (true);
create policy "follows_owner_insert" on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "follows_owner_delete" on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

create policy "blocks_owner_read" on public.blocks for select to authenticated using ((select auth.uid()) = blocker_id);
create policy "blocks_owner_insert" on public.blocks for insert to authenticated with check ((select auth.uid()) = blocker_id);
create policy "blocks_owner_delete" on public.blocks for delete to authenticated using ((select auth.uid()) = blocker_id);

create policy "reports_owner_read" on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);
create policy "reports_owner_insert" on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id and status = 'OPEN');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
