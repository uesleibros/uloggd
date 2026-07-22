-- The low-level two-account helper is intentionally private. RLS must use the
-- one-argument security-definer wrapper so clients cannot probe arbitrary
-- block relationships.
drop policy if exists "screenshots_visible_read" on public.screenshots;
create policy "screenshots_visible_read" on public.screenshots
for select to anon, authenticated using (
  not public.viewer_blocked_with(profile_id)
  and (
    visibility = 'PUBLIC'
    or profile_id = auth.uid()
    or (visibility = 'FOLLOWERS' and exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = profile_id
    ))
  )
);
