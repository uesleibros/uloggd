-- One button for all of it, and one less way to delete an account.
--
-- Clearing category by category is right when someone wants to prune; it is
-- eight confirmations when someone wants out of their data but not out of
-- their account. 'everything' runs the same deletes in one transaction, so it
-- cannot stop halfway.
--
-- `delete_own_account()` is dropped. The account already deletes through the
-- endpoint the General tab has always used, and two paths to the most
-- destructive action on the site means two places to keep correct forever.

drop function if exists public.delete_own_account();

create or replace function public.erase_account_data(category text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  removed bigint := 0;
  step bigint := 0;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if category in ('library', 'everything') then
    delete from public.user_games where profile_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;
  if category in ('reviews', 'everything') then
    delete from public.reviews where profile_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;
  if category in ('sessions', 'everything') then
    delete from public.diary_entries where profile_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;
  if category in ('journeys', 'everything') then
    -- Sessions survive their journey on a targeted clear; under 'everything'
    -- they are already gone by the time this runs.
    update public.diary_entries set journey_id = null
     where profile_id = caller and journey_id is not null;
    delete from public.journeys where profile_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;
  if category in ('lists', 'everything') then
    delete from public.game_lists where profile_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;
  if category in ('screenshots', 'everything') then
    delete from public.screenshots where profile_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;
  if category in ('comments', 'everything') then
    delete from public.content_comments where author_id = caller;
    get diagnostics step = row_count; removed := removed + step;
    delete from public.profile_comments where author_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;
  if category in ('views', 'everything') then
    delete from public.content_views where viewer_id = caller;
    get diagnostics step = row_count; removed := removed + step;
  end if;

  if category not in ('library','reviews','sessions','journeys','lists','screenshots','comments','views','everything') then
    raise exception 'unknown category: %', category using errcode = '22023';
  end if;

  return removed;
end;
$$;

revoke all on function public.erase_account_data(text) from public, anon;
grant execute on function public.erase_account_data(text) to authenticated;
