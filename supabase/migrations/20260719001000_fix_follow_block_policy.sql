-- Keep the block lookup private while allowing the follows RLS policy to
-- validate the authenticated viewer through the safe one-argument helper.

drop policy if exists "follows_owner_insert" on public.follows;
create policy "follows_owner_insert"
  on public.follows for insert to authenticated
  with check (
    auth.uid() = follower_id
    and not public.viewer_blocked_with(following_id)
  );
