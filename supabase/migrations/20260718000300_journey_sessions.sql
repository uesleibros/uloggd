-- Journey sessions: bulk day painting on the journal calendar. Dragging adds
-- one session entry per day (skipping days that already hold one) or removes
-- the user's entries anchored on those days.

create function public.bulk_save_diary_days(game_id integer, game_slug text, days date[])
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

  with candidate as (
    select distinct day from unnest(days) as day
    where not exists (
      select 1 from public.diary_entries entry
      where entry.profile_id = auth.uid()
        and entry.igdb_id = game_id
        and day between entry.played_on and coalesce(entry.ended_on, entry.played_on)
    )
  ),
  created as (
    insert into public.diary_entries(profile_id, igdb_id, game_slug, played_on)
    select auth.uid(), game_id, trim(game_slug), day from candidate
    returning 1
  )
  select count(*) into inserted from created;
  return inserted;
end;
$$;

create function public.bulk_delete_diary_days(game_id integer, days date[])
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

revoke all on function public.bulk_save_diary_days(integer,text,date[]) from public, anon;
revoke all on function public.bulk_delete_diary_days(integer,date[]) from public, anon;
grant execute on function public.bulk_save_diary_days(integer,text,date[]) to authenticated;
grant execute on function public.bulk_delete_diary_days(integer,date[]) to authenticated;
