-- Named journeys: a user can keep several titled playthroughs per game.
-- Sessions (diary_entries) and reviews can attach to one of them.

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  igdb_id integer not null,
  game_slug varchar(255) not null,
  title varchar(80) not null,
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  constraint journeys_game_check check (igdb_id > 0 and char_length(trim(game_slug)) between 1 and 255),
  constraint journeys_title_check check (char_length(trim(title)) between 1 and 80)
);

create index if not exists journeys_profile_game_idx on public.journeys(profile_id, igdb_id, created_at);

alter table public.journeys enable row level security;
grant select on public.journeys to anon, authenticated;
grant all privileges on public.journeys to service_role;
-- Titles are harmless metadata; writes happen only through the RPCs below.
create policy "journeys_read" on public.journeys for select to anon, authenticated using (true);

alter table public.diary_entries
  add column if not exists journey_id uuid references public.journeys(id) on delete cascade;
create index if not exists diary_entries_journey_idx on public.diary_entries(journey_id);

alter table public.reviews
  add column if not exists journey_id uuid references public.journeys(id) on delete set null;

create function public.create_journey(game_id integer, game_slug text, journey_title text)
returns public.journeys
language plpgsql security definer set search_path = ''
as $$
declare result public.journeys;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if char_length(trim(coalesce(journey_title, ''))) not between 1 and 80 then raise exception 'invalid title' using errcode = '22023'; end if;
  if (select count(*) from public.journeys where profile_id = auth.uid() and igdb_id = game_id) >= 20 then
    raise exception 'too many journeys' using errcode = '22023';
  end if;
  insert into public.journeys(profile_id, igdb_id, game_slug, title)
  values (auth.uid(), game_id, trim(game_slug), trim(journey_title))
  returning * into result;
  return result;
end;
$$;

create function public.rename_journey(target_journey uuid, journey_title text)
returns public.journeys
language plpgsql security definer set search_path = ''
as $$
declare result public.journeys;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(journey_title, ''))) not between 1 and 80 then raise exception 'invalid title' using errcode = '22023'; end if;
  update public.journeys set title = trim(journey_title), updated_at = now()
  where id = target_journey and profile_id = auth.uid() returning * into result;
  if result.id is null then raise exception 'journey not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create function public.delete_journey(target_journey uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare removed boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  delete from public.journeys where id = target_journey and profile_id = auth.uid();
  removed := found;
  return removed;
end;
$$;

-- Session RPCs learn about journeys (drop: added parameters change signatures).

drop function if exists public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean);
drop function if exists public.bulk_save_diary_days(integer,text,date[]);
drop function if exists public.bulk_delete_diary_days(integer,date[]);

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
  entry_journey uuid default null
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
  if entry_journey is not null and not exists(
    select 1 from public.journeys where id = entry_journey and profile_id = auth.uid() and igdb_id = game_id
  ) then raise exception 'journey not found' using errcode = 'P0002'; end if;
  insert into public.diary_entries(profile_id, igdb_id, game_slug, played_on, ended_on, minutes, note, contains_spoilers, visibility, marks_start, marks_finish, journey_id)
  values(auth.uid(), game_id, trim(game_slug), entry_date, nullif(entry_end, entry_date), entry_minutes, nullif(trim(entry_note), ''), spoilers, entry_visibility, entry_marks_start, entry_marks_finish, entry_journey)
  returning * into result;
  return result;
end;
$$;

create function public.bulk_save_diary_days(
  game_id integer,
  game_slug text,
  days date[],
  entry_journey uuid default null
)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare inserted integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if days is null or array_length(days, 1) is null or array_length(days, 1) > 366 then raise exception 'invalid days' using errcode = '22023'; end if;
  if exists(select 1 from unnest(days) as day where day is null or day > current_date) then
    raise exception 'invalid day' using errcode = '22023';
  end if;
  if entry_journey is not null and not exists(
    select 1 from public.journeys where id = entry_journey and profile_id = auth.uid() and igdb_id = game_id
  ) then raise exception 'journey not found' using errcode = 'P0002'; end if;

  with candidate as (
    select distinct day from unnest(days) as day
    where not exists (
      select 1 from public.diary_entries entry
      where entry.profile_id = auth.uid()
        and entry.igdb_id = game_id
        and entry.journey_id is not distinct from entry_journey
        and day between entry.played_on and coalesce(entry.ended_on, entry.played_on)
    )
  ),
  created as (
    insert into public.diary_entries(profile_id, igdb_id, game_slug, played_on, journey_id)
    select auth.uid(), game_id, trim(game_slug), day, entry_journey from candidate
    returning 1
  )
  select count(*) into inserted from created;
  return inserted;
end;
$$;

create function public.bulk_delete_diary_days(
  game_id integer,
  days date[],
  entry_journey uuid default null
)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare removed integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if days is null or array_length(days, 1) is null or array_length(days, 1) > 366 then raise exception 'invalid days' using errcode = '22023'; end if;

  with deleted as (
    delete from public.diary_entries entry
    where entry.profile_id = auth.uid()
      and entry.igdb_id = game_id
      and entry.journey_id is not distinct from entry_journey
      and exists (
        select 1 from unnest(days) as day
        where day between entry.played_on and coalesce(entry.ended_on, entry.played_on)
      )
    returning 1
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

-- Reviews can point at one of the author's journeys.

drop function if exists public.create_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb);
drop function if exists public.update_review(uuid,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb);

create function public.create_review(
  game_id integer,
  game_slug text,
  review_rating integer default null,
  review_content text default null,
  spoilers boolean default false,
  review_visibility public."Visibility" default 'PUBLIC',
  review_title text default null,
  review_rating_mode text default 'stars_5',
  review_recommended boolean default null,
  review_mastered boolean default false,
  review_replay boolean default false,
  review_started_on date default null,
  review_finished_on date default null,
  review_platform text default null,
  review_aspects jsonb default '[]'::jsonb,
  review_journey uuid default null
)
returns public.reviews
language plpgsql security definer set search_path = ''
as $$
declare result public.reviews;
declare aspect jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if review_rating is not null and review_rating not between 0 and 100 then raise exception 'invalid rating' using errcode = '22023'; end if;
  if review_rating_mode not in ('stars_5', 'level_5', 'score_10', 'score_100', 'recommend') then raise exception 'invalid rating mode' using errcode = '22023'; end if;
  if review_rating_mode = 'recommend' and review_recommended is null then raise exception 'recommendation required' using errcode = '22023'; end if;
  if review_rating_mode <> 'recommend' and review_rating is null and nullif(trim(coalesce(review_content, '')), '') is null and jsonb_array_length(coalesce(review_aspects, '[]'::jsonb)) = 0 then raise exception 'empty review' using errcode = '22023'; end if;
  if char_length(trim(coalesce(review_content, ''))) > 5000 then raise exception 'review too long' using errcode = '22023'; end if;
  if char_length(trim(coalesce(review_title, ''))) > 80 then raise exception 'title too long' using errcode = '22023'; end if;
  if review_started_on is not null and review_started_on > current_date then raise exception 'invalid start date' using errcode = '22023'; end if;
  if review_finished_on is not null and (review_finished_on > current_date or (review_started_on is not null and review_finished_on < review_started_on)) then raise exception 'invalid finish date' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(review_aspects, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(review_aspects, '[]'::jsonb)) > 8 then raise exception 'invalid aspects' using errcode = '22023'; end if;
  if (select count(*) from jsonb_array_elements(coalesce(review_aspects, '[]'::jsonb)) item where coalesce((item ->> 'custom')::boolean, false)) > 5 then raise exception 'too many custom aspects' using errcode = '22023'; end if;
  for aspect in select value from jsonb_array_elements(coalesce(review_aspects, '[]'::jsonb)) loop
    if jsonb_typeof(aspect) <> 'object'
      or char_length(trim(coalesce(aspect ->> 'label', ''))) not between 1 and 32
      or (aspect ->> 'rating')::integer not between 0 and 100
      or char_length(coalesce(aspect ->> 'note', '')) > 240
    then raise exception 'invalid aspect' using errcode = '22023'; end if;
  end loop;
  if review_journey is not null and not exists(
    select 1 from public.journeys where id = review_journey and profile_id = auth.uid() and igdb_id = game_id
  ) then raise exception 'journey not found' using errcode = 'P0002'; end if;

  insert into public.reviews(
    profile_id, igdb_id, game_slug, rating, content, contains_spoilers, visibility,
    title, rating_mode, recommended, mastered, replay, started_on, finished_on,
    platform, aspect_ratings, journey_id
  ) values (
    auth.uid(), game_id, trim(game_slug), review_rating, nullif(trim(review_content), ''), spoilers, review_visibility,
    nullif(trim(review_title), ''), review_rating_mode, review_recommended, review_mastered, review_replay,
    review_started_on, review_finished_on, nullif(trim(review_platform), ''), coalesce(review_aspects, '[]'::jsonb),
    review_journey
  ) returning * into result;

  insert into public.user_games(profile_id, igdb_id, game_slug, status, quick_rating)
  values(auth.uid(), game_id, trim(game_slug), 'BACKLOG', review_rating)
  on conflict(profile_id, igdb_id) do update set
    quick_rating = excluded.quick_rating, updated_at = now();
  return result;
end;
$$;

create function public.update_review(
  review_id uuid,
  review_rating integer default null,
  review_content text default null,
  spoilers boolean default false,
  review_visibility public."Visibility" default 'PUBLIC',
  review_title text default null,
  review_rating_mode text default 'stars_5',
  review_recommended boolean default null,
  review_mastered boolean default false,
  review_replay boolean default false,
  review_started_on date default null,
  review_finished_on date default null,
  review_platform text default null,
  review_aspects jsonb default '[]'::jsonb,
  review_journey uuid default null
)
returns public.reviews
language plpgsql security definer set search_path = ''
as $$
declare result public.reviews;
declare aspect jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if review_rating is not null and review_rating not between 0 and 100 then raise exception 'invalid rating' using errcode = '22023'; end if;
  if review_rating_mode not in ('stars_5', 'level_5', 'score_10', 'score_100', 'recommend') then raise exception 'invalid rating mode' using errcode = '22023'; end if;
  if review_rating_mode = 'recommend' and review_recommended is null then raise exception 'recommendation required' using errcode = '22023'; end if;
  if review_rating_mode <> 'recommend' and review_rating is null and nullif(trim(coalesce(review_content, '')), '') is null and jsonb_array_length(coalesce(review_aspects, '[]'::jsonb)) = 0 then raise exception 'empty review' using errcode = '22023'; end if;
  if char_length(trim(coalesce(review_content, ''))) > 5000 then raise exception 'review too long' using errcode = '22023'; end if;
  if char_length(trim(coalesce(review_title, ''))) > 80 then raise exception 'title too long' using errcode = '22023'; end if;
  if review_started_on is not null and review_started_on > current_date then raise exception 'invalid start date' using errcode = '22023'; end if;
  if review_finished_on is not null and (review_finished_on > current_date or (review_started_on is not null and review_finished_on < review_started_on)) then raise exception 'invalid finish date' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(review_aspects, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(review_aspects, '[]'::jsonb)) > 8 then raise exception 'invalid aspects' using errcode = '22023'; end if;
  if (select count(*) from jsonb_array_elements(coalesce(review_aspects, '[]'::jsonb)) item where coalesce((item ->> 'custom')::boolean, false)) > 5 then raise exception 'too many custom aspects' using errcode = '22023'; end if;
  for aspect in select value from jsonb_array_elements(coalesce(review_aspects, '[]'::jsonb)) loop
    if jsonb_typeof(aspect) <> 'object'
      or char_length(trim(coalesce(aspect ->> 'label', ''))) not between 1 and 32
      or (aspect ->> 'rating')::integer not between 0 and 100
      or char_length(coalesce(aspect ->> 'note', '')) > 240
    then raise exception 'invalid aspect' using errcode = '22023'; end if;
  end loop;
  if review_journey is not null and not exists(
    select 1 from public.journeys j
    where j.id = review_journey and j.profile_id = auth.uid()
      and j.igdb_id = (select r.igdb_id from public.reviews r where r.id = review_id)
  ) then raise exception 'journey not found' using errcode = 'P0002'; end if;

  update public.reviews set
    rating = review_rating,
    content = nullif(trim(review_content), ''),
    contains_spoilers = spoilers,
    visibility = review_visibility,
    title = nullif(trim(review_title), ''),
    rating_mode = review_rating_mode,
    recommended = review_recommended,
    mastered = review_mastered,
    replay = review_replay,
    started_on = review_started_on,
    finished_on = review_finished_on,
    platform = nullif(trim(review_platform), ''),
    aspect_ratings = coalesce(review_aspects, '[]'::jsonb),
    journey_id = review_journey,
    updated_at = now()
  where id = review_id and profile_id = auth.uid()
  returning * into result;
  if result.id is null then raise exception 'review not found' using errcode = 'P0002'; end if;

  update public.user_games set quick_rating = review_rating, updated_at = now()
  where profile_id = auth.uid() and igdb_id = result.igdb_id;
  return result;
end;
$$;

revoke all on function public.create_journey(integer,text,text) from public, anon;
revoke all on function public.rename_journey(uuid,text) from public, anon;
revoke all on function public.delete_journey(uuid) from public, anon;
revoke all on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean,uuid) from public, anon;
revoke all on function public.bulk_save_diary_days(integer,text,date[],uuid) from public, anon;
revoke all on function public.bulk_delete_diary_days(integer,date[],uuid) from public, anon;
revoke all on function public.create_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb,uuid) from public, anon;
revoke all on function public.update_review(uuid,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb,uuid) from public, anon;

grant execute on function public.create_journey(integer,text,text) to authenticated;
grant execute on function public.rename_journey(uuid,text) to authenticated;
grant execute on function public.delete_journey(uuid) to authenticated;
grant execute on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean,uuid) to authenticated;
grant execute on function public.bulk_save_diary_days(integer,text,date[],uuid) to authenticated;
grant execute on function public.bulk_delete_diary_days(integer,date[],uuid) to authenticated;
grant execute on function public.create_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb,uuid) to authenticated;
grant execute on function public.update_review(uuid,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb,uuid) to authenticated;
