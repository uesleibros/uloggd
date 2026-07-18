-- Journeys (diary day ranges + milestones), review editing, content likes,
-- and list management (reorder + item notes).

-- 1. Review editing -----------------------------------------------------------

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
  review_aspects jsonb default '[]'::jsonb
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
    updated_at = now()
  where id = review_id and profile_id = auth.uid()
  returning * into result;
  if result.id is null then raise exception 'review not found' using errcode = 'P0002'; end if;

  update public.user_games set quick_rating = review_rating, updated_at = now()
  where profile_id = auth.uid() and igdb_id = result.igdb_id;
  return result;
end;
$$;

-- 2. Journeys: diary entries become day ranges with start/finish milestones ----

alter table public.diary_entries
  add column if not exists ended_on date,
  add column if not exists marks_start boolean not null default false,
  add column if not exists marks_finish boolean not null default false;

alter table public.diary_entries
  drop constraint if exists diary_entries_range_check;
alter table public.diary_entries
  add constraint diary_entries_range_check check (ended_on is null or ended_on >= played_on);

drop function if exists public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility");
drop function if exists public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility");

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
  entry_marks_finish boolean default false
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
  insert into public.diary_entries(profile_id, igdb_id, game_slug, played_on, ended_on, minutes, note, contains_spoilers, visibility, marks_start, marks_finish)
  values(auth.uid(), game_id, trim(game_slug), entry_date, nullif(entry_end, entry_date), entry_minutes, nullif(trim(entry_note), ''), spoilers, entry_visibility, entry_marks_start, entry_marks_finish)
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
  entry_marks_finish boolean default false
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
    minutes = entry_minutes, note = nullif(trim(entry_note), ''), contains_spoilers = spoilers,
    visibility = entry_visibility, marks_start = entry_marks_start, marks_finish = entry_marks_finish,
    updated_at = now()
  where id = entry_id and profile_id = auth.uid() returning * into result;
  if result.id is null then raise exception 'entry not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

-- 3. Content likes (reviews, journey entries, lists) ---------------------------

create table if not exists public.content_likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null,
  content_id uuid not null,
  created_at timestamptz(6) not null default now(),
  primary key (profile_id, content_type, content_id),
  constraint content_likes_type_check check (content_type in ('review', 'diary', 'list'))
);

create index if not exists content_likes_target_idx on public.content_likes(content_type, content_id);

alter table public.content_likes enable row level security;
grant select on public.content_likes to anon, authenticated;
grant all privileges on public.content_likes to service_role;

-- Rows expose only opaque ids; writes happen exclusively through the
-- security-definer toggle below, so no insert/update/delete grants exist.
create policy "content_likes_read" on public.content_likes for select to anon, authenticated using (true);

create function public.toggle_content_like(target_type text, target_id uuid)
returns table(liked boolean, like_count bigint)
language plpgsql security definer set search_path = ''
as $$
declare visible boolean;
declare now_liked boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_type not in ('review', 'diary', 'list') then raise exception 'invalid content type' using errcode = '22023'; end if;

  if target_type = 'review' then
    select exists(
      select 1 from public.reviews r where r.id = target_id and r.profile_id <> auth.uid() and (
        r.visibility = 'PUBLIC' or
        (r.visibility = 'FOLLOWERS' and exists(select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = r.profile_id))
      )
    ) into visible;
  elsif target_type = 'diary' then
    select exists(
      select 1 from public.diary_entries d where d.id = target_id and d.profile_id <> auth.uid() and (
        d.visibility = 'PUBLIC' or
        (d.visibility = 'FOLLOWERS' and exists(select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = d.profile_id))
      )
    ) into visible;
  else
    select exists(
      select 1 from public.game_lists l where l.id = target_id and l.profile_id <> auth.uid() and (
        l.visibility = 'PUBLIC' or
        (l.visibility = 'FOLLOWERS' and exists(select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = l.profile_id))
      )
    ) into visible;
  end if;
  if not visible then raise exception 'content not found' using errcode = 'P0002'; end if;

  delete from public.content_likes
  where profile_id = auth.uid() and content_type = target_type and content_id = target_id;
  if found then
    now_liked := false;
  else
    insert into public.content_likes(profile_id, content_type, content_id)
    values (auth.uid(), target_type, target_id);
    now_liked := true;
  end if;

  return query select now_liked, count(*)::bigint from public.content_likes
  where content_type = target_type and content_id = target_id;
end;
$$;

create function public.get_content_likes(target_type text, target_ids uuid[])
returns table(content_id uuid, like_count bigint, liked_by_viewer boolean)
language sql stable security definer set search_path = ''
as $$
  select ids.id, count(likes.profile_id)::bigint,
    coalesce(bool_or(likes.profile_id = auth.uid()), false)
  from unnest(target_ids) as ids(id)
  left join public.content_likes likes
    on likes.content_type = target_type and likes.content_id = ids.id
  group by ids.id
$$;

-- 4. List management: manual reorder + item notes ------------------------------

create function public.move_list_item(target_list uuid, item_id uuid, direction text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare current_position integer;
declare neighbor_id uuid;
declare neighbor_position integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if direction not in ('up', 'down', 'top') then raise exception 'invalid direction' using errcode = '22023'; end if;
  if not exists(select 1 from public.game_lists where id = target_list and profile_id = auth.uid()) then
    raise exception 'list not found' using errcode = '42501';
  end if;
  select item.position into current_position from public.game_list_items item
  where item.id = item_id and item.list_id = target_list;
  if current_position is null then raise exception 'item not found' using errcode = 'P0002'; end if;

  if direction = 'top' then
    if current_position = 0 then return false; end if;
    update public.game_list_items set position = -1 where id = item_id;
    with ordered as (
      select id, row_number() over(order by position, created_at) - 1 as new_position
      from public.game_list_items where list_id = target_list
    )
    update public.game_list_items item set position = ordered.new_position
    from ordered where item.id = ordered.id and item.position <> ordered.new_position;
    return true;
  end if;

  if direction = 'up' then
    select item.id, item.position into neighbor_id, neighbor_position from public.game_list_items item
    where item.list_id = target_list and item.position < current_position
    order by item.position desc limit 1;
  else
    select item.id, item.position into neighbor_id, neighbor_position from public.game_list_items item
    where item.list_id = target_list and item.position > current_position
    order by item.position asc limit 1;
  end if;
  if neighbor_id is null then return false; end if;

  update public.game_list_items set position = neighbor_position where id = item_id;
  update public.game_list_items set position = current_position where id = neighbor_id;
  return true;
end;
$$;

create function public.set_list_item_note(target_list uuid, item_id uuid, item_note text default null)
returns public.game_list_items
language plpgsql security definer set search_path = ''
as $$
declare result public.game_list_items;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(item_note, ''))) > 300 then raise exception 'note too long' using errcode = '22023'; end if;
  if not exists(select 1 from public.game_lists where id = target_list and profile_id = auth.uid()) then
    raise exception 'list not found' using errcode = '42501';
  end if;
  update public.game_list_items set note = nullif(trim(item_note), '')
  where id = item_id and list_id = target_list returning * into result;
  if result.id is null then raise exception 'item not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

-- 5. Grants --------------------------------------------------------------------

revoke all on function public.update_review(uuid,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb) from public, anon;
revoke all on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean) from public, anon;
revoke all on function public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility",date,boolean,boolean) from public, anon;
revoke all on function public.toggle_content_like(text,uuid) from public, anon;
revoke all on function public.get_content_likes(text,uuid[]) from public;
revoke all on function public.move_list_item(uuid,uuid,text) from public, anon;
revoke all on function public.set_list_item_note(uuid,uuid,text) from public, anon;

grant execute on function public.update_review(uuid,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb) to authenticated;
grant execute on function public.save_diary_entry(integer,text,date,integer,text,boolean,public."Visibility",date,boolean,boolean) to authenticated;
grant execute on function public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility",date,boolean,boolean) to authenticated;
grant execute on function public.toggle_content_like(text,uuid) to authenticated;
grant execute on function public.get_content_likes(text,uuid[]) to anon, authenticated;
grant execute on function public.move_list_item(uuid,uuid,text) to authenticated;
grant execute on function public.set_list_item_note(uuid,uuid,text) to authenticated;
