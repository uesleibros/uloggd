create or replace function public.delete_review(review_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare target_game integer; removed boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select igdb_id into target_game from public.reviews where id = review_id and profile_id = auth.uid();
  delete from public.reviews where id = review_id and profile_id = auth.uid();
  removed := found;
  if removed then
    update public.user_games set quick_rating = null, updated_at = now()
    where profile_id = auth.uid() and igdb_id = target_game;
  end if;
  return removed;
end; $$;

create or replace function public.update_diary_entry(
  entry_id uuid, entry_date date, entry_minutes integer default null,
  entry_note text default null, spoilers boolean default false,
  entry_visibility public."Visibility" default 'PUBLIC'
)
returns public.diary_entries language plpgsql security definer set search_path = '' as $$
declare result public.diary_entries;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if entry_date is null or entry_date > current_date then raise exception 'invalid date' using errcode = '22023'; end if;
  if entry_minutes is not null and entry_minutes not between 0 and 100000 then raise exception 'invalid minutes' using errcode = '22023'; end if;
  if char_length(trim(coalesce(entry_note, ''))) > 1000 then raise exception 'note too long' using errcode = '22023'; end if;
  update public.diary_entries set played_on = entry_date, minutes = entry_minutes,
    note = nullif(trim(entry_note), ''), contains_spoilers = spoilers,
    visibility = entry_visibility, updated_at = now()
  where id = entry_id and profile_id = auth.uid() returning * into result;
  if result.id is null then raise exception 'entry not found' using errcode = 'P0002'; end if;
  return result;
end; $$;

create or replace function public.delete_diary_entry(entry_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare removed boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  delete from public.diary_entries where id = entry_id and profile_id = auth.uid();
  removed := found; return removed;
end; $$;

create or replace function public.update_game_list(
  target_list uuid, list_name text, list_description text default null,
  list_visibility public."Visibility" default 'PUBLIC'
)
returns public.game_lists language plpgsql security definer set search_path = '' as $$
declare result public.game_lists;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(list_name)) not between 1 and 100 then raise exception 'invalid name' using errcode = '22023'; end if;
  if char_length(trim(coalesce(list_description, ''))) > 500 then raise exception 'description too long' using errcode = '22023'; end if;
  update public.game_lists set name = trim(list_name), description = nullif(trim(list_description), ''),
    visibility = list_visibility, updated_at = now()
  where id = target_list and profile_id = auth.uid() returning * into result;
  if result.id is null then raise exception 'list not found' using errcode = 'P0002'; end if;
  return result;
end; $$;

create or replace function public.delete_game_list(target_list uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare removed boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  delete from public.game_lists where id = target_list and profile_id = auth.uid();
  removed := found; return removed;
end; $$;

create or replace function public.remove_game_from_list(target_list uuid, game_id integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare removed boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists(select 1 from public.game_lists where id = target_list and profile_id = auth.uid()) then
    raise exception 'list not found' using errcode = '42501';
  end if;
  delete from public.game_list_items where list_id = target_list and igdb_id = game_id;
  removed := found;
  with ordered as (select id, row_number() over(order by position, created_at) - 1 as new_position from public.game_list_items where list_id = target_list)
  update public.game_list_items item set position = ordered.new_position from ordered where item.id = ordered.id;
  return removed;
end; $$;

drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_visible_read" on public.reviews for select to anon, authenticated using (
  visibility = 'PUBLIC' or auth.uid() = profile_id or
  (visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = profile_id))
);
drop policy if exists "diary_visible_read" on public.diary_entries;
create policy "diary_visible_read" on public.diary_entries for select to anon, authenticated using (
  visibility = 'PUBLIC' or auth.uid() = profile_id or
  (visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = profile_id))
);
drop policy if exists "game_lists_public_read" on public.game_lists;
create policy "game_lists_visible_read" on public.game_lists for select to anon, authenticated using (
  visibility = 'PUBLIC' or auth.uid() = profile_id or
  (visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = profile_id))
);
drop policy if exists "game_list_items_visible_read" on public.game_list_items;
create policy "game_list_items_visible_read" on public.game_list_items for select to anon, authenticated using (
  exists(select 1 from public.game_lists where game_lists.id = list_id and (
    game_lists.visibility = 'PUBLIC' or game_lists.profile_id = auth.uid() or
    (game_lists.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = game_lists.profile_id))
  ))
);

revoke all on function public.delete_review(uuid) from public, anon;
revoke all on function public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility") from public, anon;
revoke all on function public.delete_diary_entry(uuid) from public, anon;
revoke all on function public.update_game_list(uuid,text,text,public."Visibility") from public, anon;
revoke all on function public.delete_game_list(uuid) from public, anon;
revoke all on function public.remove_game_from_list(uuid,integer) from public, anon;
grant execute on function public.delete_review(uuid) to authenticated;
grant execute on function public.update_diary_entry(uuid,date,integer,text,boolean,public."Visibility") to authenticated;
grant execute on function public.delete_diary_entry(uuid) to authenticated;
grant execute on function public.update_game_list(uuid,text,text,public."Visibility") to authenticated;
grant execute on function public.delete_game_list(uuid) to authenticated;
grant execute on function public.remove_game_from_list(uuid,integer) to authenticated;
