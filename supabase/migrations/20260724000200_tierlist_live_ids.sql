-- Which tier items are still in the owner's library, resolved with the owner's
-- reach. A public tierlist stays whole even when its owner keeps a private
-- library, the viewer cannot read user_games directly, so the reconciliation
-- has to run in a definer function. Visibility is re-checked here against the
-- exact predicate game_lists_visible_read uses, so this leaks nothing the list
-- itself would not already show.
create or replace function public.tierlist_live_ids(target_list uuid)
returns setof integer
language sql
stable
security definer
set search_path = ''
as $$
  select ti.igdb_id
  from public.game_lists gl
  join public.tierlist_items ti on ti.list_id = gl.id
  join public.user_games ug
    on ug.profile_id = gl.profile_id and ug.igdb_id = ti.igdb_id
  where gl.id = target_list
    and not public.viewer_blocked_with(gl.profile_id)
    and (
      gl.visibility = 'PUBLIC'
      or gl.profile_id = auth.uid()
      or (
        gl.visibility = 'FOLLOWERS'
        and exists (
          select 1 from public.follows
          where follower_id = auth.uid() and following_id = gl.profile_id
        )
      )
    );
$$;
revoke all on function public.tierlist_live_ids(uuid) from public;
grant execute on function public.tierlist_live_ids(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
