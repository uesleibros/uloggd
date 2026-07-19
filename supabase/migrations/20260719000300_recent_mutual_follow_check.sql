create function public.is_recent_mutual_follow(target_profile uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    auth.uid() is not null
    and target_profile is not null
    and exists(
      select 1 from public.follows outgoing
      where outgoing.follower_id = auth.uid()
        and outgoing.following_id = target_profile
        and outgoing.created_at >= now() - interval '7 days'
    )
    and exists(
      select 1 from public.follows reciprocal
      where reciprocal.follower_id = target_profile
        and reciprocal.following_id = auth.uid()
    )
$$;

revoke all on function public.is_recent_mutual_follow(uuid) from public, anon;
grant execute on function public.is_recent_mutual_follow(uuid) to authenticated;
