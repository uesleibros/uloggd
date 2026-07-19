-- RLS needs an executable helper, but callers must never probe block
-- relationships between arbitrary account ids.

create function public.viewer_blocked_with(other_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and public.users_blocked(auth.uid(), other_user)
$$;

revoke all on function public.viewer_blocked_with(uuid) from public;
grant execute on function public.viewer_blocked_with(uuid) to anon, authenticated;

drop policy if exists "reviews_visible_read" on public.reviews;
create policy "reviews_visible_read" on public.reviews for select to anon, authenticated
using (
  not public.viewer_blocked_with(profile_id)
  and (
    visibility = 'PUBLIC' or auth.uid() = profile_id or
    (visibility = 'FOLLOWERS' and exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = profile_id
    ))
  )
);

drop policy if exists "diary_visible_read" on public.diary_entries;
create policy "diary_visible_read" on public.diary_entries for select to anon, authenticated
using (
  not public.viewer_blocked_with(profile_id)
  and (
    visibility = 'PUBLIC' or auth.uid() = profile_id or
    (visibility = 'FOLLOWERS' and exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = profile_id
    ))
  )
);

drop policy if exists "game_lists_visible_read" on public.game_lists;
create policy "game_lists_visible_read" on public.game_lists for select to anon, authenticated
using (
  not public.viewer_blocked_with(profile_id)
  and (
    visibility = 'PUBLIC' or auth.uid() = profile_id or
    (visibility = 'FOLLOWERS' and exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = profile_id
    ))
  )
);

drop policy if exists "user_games_visible_read" on public.user_games;
create policy "user_games_visible_read" on public.user_games for select to anon, authenticated
using (
  not public.viewer_blocked_with(profile_id)
  and (
    profile_id = auth.uid() or exists (
      select 1 from public.profiles
      where profiles.id = user_games.profile_id
        and profiles.library_visibility = 'PUBLIC'
    )
  )
);

drop policy if exists "profile_comments_visible_read" on public.profile_comments;
create policy "profile_comments_visible_read"
  on public.profile_comments for select to anon, authenticated
  using (
    not public.viewer_blocked_with(author_id)
    and not public.viewer_blocked_with(profile_id)
  );
