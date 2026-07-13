create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  igdb_id integer not null,
  game_slug varchar(255) not null,
  played_on date not null default current_date,
  minutes integer,
  note varchar(1000),
  contains_spoilers boolean not null default false,
  visibility public."Visibility" not null default 'PUBLIC',
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  constraint diary_entries_game_check check (igdb_id > 0 and char_length(trim(game_slug)) between 1 and 255),
  constraint diary_entries_minutes_check check (minutes is null or minutes between 0 and 100000),
  constraint diary_entries_note_check check (note is null or char_length(note) <= 1000)
);

create index if not exists diary_entries_profile_date_idx on public.diary_entries(profile_id, played_on desc, created_at desc);
create index if not exists diary_entries_public_date_idx on public.diary_entries(played_on desc, created_at desc) where visibility = 'PUBLIC';

alter table public.diary_entries enable row level security;
grant select on public.diary_entries to anon, authenticated;
grant insert, update, delete on public.diary_entries to authenticated;
grant all privileges on public.diary_entries to service_role;

create policy "diary_visible_read" on public.diary_entries for select to anon, authenticated
using (visibility = 'PUBLIC' or (select auth.uid()) = profile_id);
create policy "diary_owner_insert" on public.diary_entries for insert to authenticated
with check ((select auth.uid()) = profile_id);
create policy "diary_owner_update" on public.diary_entries for update to authenticated
using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "diary_owner_delete" on public.diary_entries for delete to authenticated
using ((select auth.uid()) = profile_id);

drop policy if exists "user_games_public_read" on public.user_games;
create policy "user_games_public_read" on public.user_games for select to anon, authenticated using (true);
grant select on public.user_games to anon;

create or replace function public.save_review(
  game_id integer,
  game_slug text,
  review_rating integer,
  review_content text,
  spoilers boolean default false,
  review_visibility public."Visibility" default 'PUBLIC'
)
returns public.reviews
language plpgsql security definer set search_path = ''
as $$
declare result public.reviews;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if review_rating not between 0 and 100 or review_rating % 10 <> 0 then raise exception 'invalid rating' using errcode = '22023'; end if;
  if char_length(trim(coalesce(review_content, ''))) > 5000 then raise exception 'review too long' using errcode = '22023'; end if;

  insert into public.reviews(profile_id, igdb_id, game_slug, rating, content, contains_spoilers, visibility)
  values (auth.uid(), game_id, trim(game_slug), review_rating, nullif(trim(review_content), ''), spoilers, review_visibility)
  on conflict (profile_id, igdb_id) do update set
    rating = excluded.rating, content = excluded.content, contains_spoilers = excluded.contains_spoilers,
    visibility = excluded.visibility, updated_at = now()
  returning * into result;

  update public.user_games set quick_rating = review_rating, updated_at = now()
  where profile_id = auth.uid() and igdb_id = game_id;
  if not found then
    insert into public.user_games(profile_id, igdb_id, game_slug, status, quick_rating)
    values(auth.uid(), game_id, trim(game_slug), 'BACKLOG', review_rating);
  end if;
  return result;
end;
$$;

create or replace function public.save_diary_entry(
  game_id integer,
  game_slug text,
  entry_date date,
  entry_minutes integer default null,
  entry_note text default null,
  spoilers boolean default false,
  entry_visibility public."Visibility" default 'PUBLIC'
)
returns public.diary_entries
language plpgsql security definer set search_path = ''
as $$
declare result public.diary_entries;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if entry_date is null or entry_date > current_date then raise exception 'invalid date' using errcode = '22023'; end if;
  if entry_minutes is not null and entry_minutes not between 0 and 100000 then raise exception 'invalid minutes' using errcode = '22023'; end if;
  if char_length(trim(coalesce(entry_note, ''))) > 1000 then raise exception 'note too long' using errcode = '22023'; end if;
  insert into public.diary_entries(profile_id, igdb_id, game_slug, played_on, minutes, note, contains_spoilers, visibility)
  values(auth.uid(), game_id, trim(game_slug), entry_date, entry_minutes, nullif(trim(entry_note), ''), spoilers, entry_visibility)
  returning * into result;
  return result;
end;
$$;

create or replace function public.create_game_list(
  list_name text,
  list_description text default null,
  list_visibility public."Visibility" default 'PUBLIC'
)
returns public.game_lists
language plpgsql security definer set search_path = ''
as $$
declare result public.game_lists;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(list_name)) not between 1 and 100 then raise exception 'invalid name' using errcode = '22023'; end if;
  if char_length(trim(coalesce(list_description, ''))) > 500 then raise exception 'description too long' using errcode = '22023'; end if;
  insert into public.game_lists(profile_id, name, description, visibility)
  values(auth.uid(), trim(list_name), nullif(trim(list_description), ''), list_visibility)
  returning * into result;
  return result;
end;
$$;

create or replace function public.add_game_to_list(target_list uuid, game_id integer, game_slug text)
returns public.game_list_items
language plpgsql security definer set search_path = ''
as $$
declare result public.game_list_items;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists(select 1 from public.game_lists where id = target_list and profile_id = auth.uid()) then raise exception 'list not found' using errcode = '42501'; end if;
  insert into public.game_list_items(list_id, igdb_id, game_slug, position)
  values(target_list, game_id, trim(game_slug), coalesce((select max(position) + 1 from public.game_list_items where list_id = target_list), 0))
  on conflict(list_id, igdb_id) do update set game_slug = excluded.game_slug
  returning * into result;
  return result;
end;
$$;

revoke all on function public.save_review(integer,text,integer,text,boolean,public."Visibility") from public, anon;
revoke all on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility") from public, anon;
revoke all on function public.create_game_list(text,text,public."Visibility") from public, anon;
revoke all on function public.add_game_to_list(uuid,integer,text) from public, anon;
grant execute on function public.save_review(integer,text,integer,text,boolean,public."Visibility") to authenticated;
grant execute on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility") to authenticated;
grant execute on function public.create_game_list(text,text,public."Visibility") to authenticated;
grant execute on function public.add_game_to_list(uuid,integer,text) to authenticated;
