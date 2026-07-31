-- The journal becomes a real diary: a day can hold several entries, each one
-- can carry an optional clock time, and each one can carry ordered images.
--
-- Nothing about the calendar's day painting changes: dragging still creates one
-- entry per empty day. What changes is that a day is no longer a single slot.

-- 1. Optional time of day -----------------------------------------------------

alter table public.diary_entries
  add column if not exists started_at time(0);

-- The journal reads a game's sessions day by day and, inside a day, in clock
-- order. Entries without a time sort after the timed ones (nulls last on an
-- ascending scan), which is why the index carries `started_at` explicitly.
create index if not exists diary_entries_profile_game_day_idx
  on public.diary_entries(profile_id, igdb_id, played_on, started_at);

-- 2. Ordered images per entry -------------------------------------------------

create table if not exists public.diary_entry_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  caption varchar(200),
  width integer not null,
  height integer not null,
  position smallint not null default 0,
  created_at timestamptz(6) not null default now(),
  constraint diary_entry_images_size_check
    check (width between 1 and 20000 and height between 1 and 20000),
  constraint diary_entry_images_position_check check (position between 0 and 11)
);

create index if not exists diary_entry_images_entry_idx
  on public.diary_entry_images(entry_id, position);

alter table public.diary_entry_images enable row level security;
grant select on public.diary_entry_images to anon, authenticated;
grant insert, update, delete on public.diary_entry_images to authenticated;
grant all privileges on public.diary_entry_images to service_role;

-- An image is exactly as visible as the entry it belongs to.
create or replace function public.diary_entry_visible(target_entry uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.diary_entries entry
    where entry.id = target_entry
      and not public.users_blocked(auth.uid(), entry.profile_id)
      and (
        entry.visibility = 'PUBLIC'
        or entry.profile_id = auth.uid()
        or (entry.visibility = 'FOLLOWERS' and exists(
          select 1 from public.follows
          where follower_id = auth.uid() and following_id = entry.profile_id
        ))
      )
  )
$$;

create policy "diary_images_visible_read" on public.diary_entry_images
for select to anon, authenticated using (public.diary_entry_visible(entry_id));
create policy "diary_images_owner_insert" on public.diary_entry_images
for insert to authenticated with check (
  profile_id = (select auth.uid())
  and exists(
    select 1 from public.diary_entries entry
    where entry.id = diary_entry_images.entry_id
      and entry.profile_id = (select auth.uid())
  )
);
create policy "diary_images_owner_update" on public.diary_entry_images
for update to authenticated using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
create policy "diary_images_owner_delete" on public.diary_entry_images
for delete to authenticated using (profile_id = (select auth.uid()));

-- 3. Storage ------------------------------------------------------------------

-- Journal images live in the existing private screenshots bucket, under
-- `{owner}/journal/…`, so the owner-scoped insert and delete policies already
-- cover them. Only the read policy has to learn about the second table.
create or replace function public.diary_image_file_visible(target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.diary_entry_images image
    where image.storage_path = target_path
      and public.diary_entry_visible(image.entry_id)
  )
$$;

drop policy if exists "screenshot_files_visible_read" on storage.objects;
create policy "screenshot_files_visible_read" on storage.objects
for select to anon, authenticated using (
  bucket_id = 'screenshots'
  and (
    public.screenshot_file_visible(name)
    or public.diary_image_file_visible(name)
  )
);

-- 4. Session RPCs learn the optional time -------------------------------------

drop function if exists public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean,uuid);
drop function if exists public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility",date,boolean,boolean);

create function public.save_diary_entry(
  game_id integer,
  game_slug text,
  entry_date date,
  entry_minutes integer default null,
  entry_note text default null,
  spoilers boolean default false,
  entry_visibility public."Visibility" default 'PUBLIC',
  entry_end date default null,
  entry_marks_start boolean default false,
  entry_marks_finish boolean default false,
  entry_journey uuid default null,
  entry_time time default null
)
returns public.diary_entries
language plpgsql security definer set search_path = ''
as $$
declare result public.diary_entries;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if entry_date is null or entry_date > current_date then raise exception 'invalid date' using errcode = '22023'; end if;
  if entry_end is not null and (entry_end > current_date or entry_end < entry_date) then raise exception 'invalid end date' using errcode = '22023'; end if;
  if entry_minutes is not null and entry_minutes not between 0 and 100000 then raise exception 'invalid minutes' using errcode = '22023'; end if;
  if char_length(trim(coalesce(entry_note, ''))) > 1000 then raise exception 'note too long' using errcode = '22023'; end if;
  -- A day holds many entries now, so the only ceiling is a sanity limit that
  -- keeps one game-day from being used as unbounded storage.
  if (
    select count(*) from public.diary_entries entry
    where entry.profile_id = auth.uid() and entry.igdb_id = game_id
      and entry.played_on = entry_date
  ) >= 24 then raise exception 'too many entries for that day' using errcode = '22023'; end if;
  if entry_journey is not null and not exists(
    select 1 from public.journeys where id = entry_journey and profile_id = auth.uid() and igdb_id = game_id
  ) then raise exception 'journey not found' using errcode = 'P0002'; end if;
  insert into public.diary_entries(profile_id, igdb_id, game_slug, played_on, ended_on, started_at, minutes, note, contains_spoilers, visibility, marks_start, marks_finish, journey_id)
  values(auth.uid(), game_id, trim(game_slug), entry_date, nullif(entry_end, entry_date), entry_time, entry_minutes, nullif(trim(entry_note), ''), spoilers, entry_visibility, entry_marks_start, entry_marks_finish, entry_journey)
  returning * into result;
  return result;
end;
$$;

create function public.update_diary_entry(
  entry_id uuid,
  entry_date date,
  entry_minutes integer default null,
  entry_note text default null,
  spoilers boolean default false,
  entry_visibility public."Visibility" default 'PUBLIC',
  entry_end date default null,
  entry_marks_start boolean default false,
  entry_marks_finish boolean default false,
  entry_time time default null
)
returns public.diary_entries
language plpgsql security definer set search_path = ''
as $$
declare result public.diary_entries;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if entry_date is null or entry_date > current_date then raise exception 'invalid date' using errcode = '22023'; end if;
  if entry_end is not null and (entry_end > current_date or entry_end < entry_date) then raise exception 'invalid end date' using errcode = '22023'; end if;
  if entry_minutes is not null and entry_minutes not between 0 and 100000 then raise exception 'invalid minutes' using errcode = '22023'; end if;
  if char_length(trim(coalesce(entry_note, ''))) > 1000 then raise exception 'note too long' using errcode = '22023'; end if;
  update public.diary_entries set played_on = entry_date, ended_on = nullif(entry_end, entry_date),
    started_at = entry_time, minutes = entry_minutes, note = nullif(trim(entry_note), ''),
    contains_spoilers = spoilers, visibility = entry_visibility,
    marks_start = entry_marks_start, marks_finish = entry_marks_finish,
    updated_at = now()
  where id = entry_id and profile_id = auth.uid() returning * into result;
  if result.id is null then raise exception 'entry not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

-- 5. Image ordering -----------------------------------------------------------

-- Reordering is one statement instead of one round trip per image, so a drag
-- that moves several positions can never leave the gallery half-renumbered.
create function public.reorder_diary_entry_images(
  target_entry uuid,
  image_ids uuid[]
)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare updated integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if image_ids is null or array_length(image_ids, 1) is null or array_length(image_ids, 1) > 12 then
    raise exception 'invalid order' using errcode = '22023';
  end if;
  if not exists(
    select 1 from public.diary_entries entry
    where entry.id = target_entry and entry.profile_id = auth.uid()
  ) then raise exception 'entry not found' using errcode = 'P0002'; end if;

  with ordered as (
    select ranked.image_id, (ranked.rank_index - 1)::smallint as next_position
    from unnest(image_ids) with ordinality as ranked(image_id, rank_index)
  ),
  applied as (
    update public.diary_entry_images image
    set position = ordered.next_position
    from ordered
    where image.id = ordered.image_id
      and image.entry_id = target_entry
      and image.profile_id = auth.uid()
    returning 1
  )
  select count(*) into updated from applied;
  return updated;
end;
$$;

revoke all on function public.diary_entry_visible(uuid) from public, anon;
revoke all on function public.diary_image_file_visible(text) from public, anon;
revoke all on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean,uuid,time) from public, anon;
revoke all on function public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility",date,boolean,boolean,time) from public, anon;
revoke all on function public.reorder_diary_entry_images(uuid,uuid[]) from public, anon;

grant execute on function public.diary_entry_visible(uuid) to anon, authenticated;
grant execute on function public.diary_image_file_visible(text) to anon, authenticated;
grant execute on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean,uuid,time) to authenticated;
grant execute on function public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility",date,boolean,boolean,time) to authenticated;
grant execute on function public.reorder_diary_entry_images(uuid,uuid[]) to authenticated;
