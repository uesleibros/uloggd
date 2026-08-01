-- People can like their own posts.
--
-- Every branch of `toggle_content_like` carried `profile_id <> auth.uid()`, so
-- liking your own review answered "content not found", which is both a refusal
-- nobody asked for and a misleading way to say it.
--
-- There was never a reason for the rule. A like here is a bookmark as much as
-- an endorsement, and the counts are small and public: someone padding their
-- own is visible to everyone looking at it. The restriction only meant an
-- author could not mark their own favourite.
--
-- Notifications are unaffected, and were already correct: the trigger returns
-- early when `owner_id = event_actor_id`, so nobody is told about their own
-- like. That guard is what makes this change safe to make here rather than
-- needing a second one alongside it.

create or replace function public.toggle_content_like(target_type text, target_id uuid)
returns table (liked boolean, like_count bigint)
language plpgsql security definer set search_path = ''
as $$
declare visible boolean;
declare now_liked boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;

  -- The owner clause is gone from each branch. The visibility checks stay, and
  -- `content_comments_visible` already answers true for an author looking at
  -- their own post whatever its visibility, so no special case is needed here.
  if target_type = 'screenshot' then
    select exists(select 1 from public.screenshots item
      where item.id = target_id
        and public.content_comments_visible('screenshot', item.id)) into visible;
  elsif target_type = 'review' then
    select exists(select 1 from public.reviews item
      where item.id = target_id
        and public.content_comments_visible('review', item.id)) into visible;
  elsif target_type = 'list' then
    select exists(select 1 from public.game_lists item
      where item.id = target_id
        and public.content_comments_visible('list', item.id)) into visible;
  elsif target_type = 'diary' then
    -- This branch checks visibility inline rather than through the shared
    -- function, so the author case has to be stated: without it, someone could
    -- not like their own private entry.
    select exists(select 1 from public.diary_entries item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id)
      and (item.profile_id = auth.uid()
        or item.visibility = 'PUBLIC'
        or (item.visibility = 'FOLLOWERS' and exists(
          select 1 from public.follows where follower_id = auth.uid()
            and following_id = item.profile_id)))) into visible;
  elsif target_type = 'profile_comment' then
    select exists(select 1 from public.profile_comments item where item.id = target_id
      and item.deleted_at is null
      and not public.users_blocked(auth.uid(), item.author_id)
      and not public.users_blocked(auth.uid(), item.profile_id)) into visible;
  elsif target_type = 'content_comment' then
    select exists(select 1 from public.content_comments item where item.id = target_id
      and item.deleted_at is null
      and public.content_comments_visible(item.content_type, item.content_id)) into visible;
  else
    raise exception 'invalid content type' using errcode = '22023';
  end if;
  if not visible then raise exception 'content not found' using errcode = 'P0002'; end if;

  delete from public.content_likes where profile_id = auth.uid()
    and content_type = target_type and content_id = target_id;
  if found then now_liked := false;
  else
    insert into public.content_likes(profile_id, content_type, content_id)
    values(auth.uid(), target_type, target_id);
    now_liked := true;
  end if;
  return query select now_liked, count(*)::bigint from public.content_likes
    where content_type = target_type and content_id = target_id;
end;
$$;

revoke all on function public.toggle_content_like(text,uuid) from public, anon;
grant execute on function public.toggle_content_like(text,uuid) to authenticated;
