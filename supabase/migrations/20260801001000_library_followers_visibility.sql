-- The library gains the middle setting every other surface already has.
--
-- Reviews, journal entries, screenshots and lists can each be public, limited
-- to followers, or private. The library could only be public or private, even
-- though `library_visibility` is the same three-value type as the rest. The
-- middle option simply had no policy behind it, so choosing it would have
-- behaved as private while claiming otherwise.
--
-- Adding it to the interface without this would have been worse than leaving
-- it out: a privacy control that does not do what it says is the one kind of
-- bug people cannot detect for themselves.
drop policy if exists user_games_visible_read on public.user_games;

create policy user_games_visible_read on public.user_games
  for select
  using (
    (not public.viewer_blocked_with(profile_id))
    and (
      profile_id = (select auth.uid())
      or exists (
        select 1
        from public.profiles owner
        where owner.id = user_games.profile_id
          and (
            owner.library_visibility = 'PUBLIC'
            -- Followers see it only while they are following. The check reads
            -- the current relationship rather than a stored flag, so unfollowing
            -- takes effect immediately, and blocking already removes the follow
            -- in both directions.
            or (
              owner.library_visibility = 'FOLLOWERS'
              and exists (
                select 1
                from public.follows f
                where f.following_id = owner.id
                  and f.follower_id = (select auth.uid())
              )
            )
          )
      )
    )
  );

/**
 * Owner-only switch for the library's visibility.
 *
 * Replaces a two-state toggle, so it validates the value rather than assuming
 * the caller sends one of two strings.
 */
create or replace function public.set_library_visibility(next_visibility text)
returns public."Visibility"
language plpgsql security definer set search_path = ''
as $$
declare resolved public."Visibility";
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if next_visibility not in ('PUBLIC', 'FOLLOWERS', 'PRIVATE') then
    raise exception 'invalid visibility' using errcode = '22023';
  end if;
  resolved := next_visibility::public."Visibility";
  update public.profiles
     set library_visibility = resolved, updated_at = now()
   where id = auth.uid();
  return resolved;
end;
$$;

revoke all on function public.set_library_visibility(text) from public, anon;
grant execute on function public.set_library_visibility(text) to authenticated;
