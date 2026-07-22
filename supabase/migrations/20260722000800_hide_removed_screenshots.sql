-- moderate_screenshot marks deleted_at, but nothing ever filtered on it: the
-- read policy only checked visibility and blocks. A screenshot removed by
-- moderation stayed fully readable — it kept rendering on its own page, in the
-- author's gallery, in the profile grid, and in the activity feed, and the app
-- kept minting fresh signed URLs for the media. Only the description was
-- blanked, which is the one part a reader would miss least.
--
-- Filtering here rather than in each query means every reader is covered by one
-- rule, including the ones added later. Moderators keep read access so the
-- console can still show that a report was actioned.

drop policy if exists "screenshots_visible_read" on public.screenshots;
create policy "screenshots_visible_read" on public.screenshots
for select to anon, authenticated using (
  (deleted_at is null or (select private.is_moderator()))
  and not public.viewer_blocked_with(profile_id)
  and (
    visibility = 'PUBLIC'
    or profile_id = auth.uid()
    or (visibility = 'FOLLOWERS' and exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = profile_id
    ))
  )
);

-- content_comments_visible gates both commenting and liking, and it is security
-- definer, so it never saw the policy above. Without this a reader who already
-- had the page open could keep commenting on a removed screenshot.
create or replace function public.content_comments_visible(target_type text, target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case target_type
    when 'list' then exists(select 1 from public.game_lists item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    when 'review' then exists(select 1 from public.reviews item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    when 'screenshot' then exists(select 1 from public.screenshots item where item.id = target_id
      and item.deleted_at is null
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    when 'diary' then exists(select 1 from public.diary_entries item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    else false end
$$;

-- Every listing filters on deleted_at now, so give the planner the partial index.
create index if not exists screenshots_live_profile_created_idx
  on public.screenshots(profile_id, created_at desc)
  where deleted_at is null;
