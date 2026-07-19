-- Viewer cover preference and safe handling for recent mutual follows.

alter table public.profiles
  add column if not exists custom_cover_scope text not null default 'OWN';

alter table public.profiles
  drop constraint if exists profiles_custom_cover_scope_check;
alter table public.profiles
  add constraint profiles_custom_cover_scope_check
  check (custom_cover_scope in ('OWN', 'EVERYONE'));

create function public.set_custom_cover_scope(new_scope text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if new_scope not in ('OWN', 'EVERYONE') then
    raise exception 'invalid cover scope' using errcode = '22023';
  end if;
  update public.profiles
  set custom_cover_scope = new_scope, updated_at = now()
  where id = auth.uid();
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return new_scope;
end;
$$;

create function public.unfollow_profile(target_profile uuid)
returns table(unfollowed boolean, reciprocal_removed boolean)
language plpgsql security definer set search_path = ''
as $$
declare followed_at timestamptz;
declare remove_reciprocal boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if target_profile is null or target_profile = auth.uid() then
    raise exception 'invalid profile' using errcode = '22023';
  end if;

  select created_at into followed_at
  from public.follows
  where follower_id = auth.uid() and following_id = target_profile;

  if followed_at is null then
    return query select false, false;
    return;
  end if;

  remove_reciprocal :=
    followed_at >= now() - interval '7 days'
    and exists(
      select 1 from public.follows
      where follower_id = target_profile and following_id = auth.uid()
    );

  delete from public.follows
  where follower_id = auth.uid() and following_id = target_profile;

  if remove_reciprocal then
    delete from public.follows
    where follower_id = target_profile and following_id = auth.uid();
  end if;

  return query select true, remove_reciprocal;
end;
$$;

revoke all on function public.set_custom_cover_scope(text) from public, anon;
revoke all on function public.unfollow_profile(uuid) from public, anon;
grant execute on function public.set_custom_cover_scope(text) to authenticated;
grant execute on function public.unfollow_profile(uuid) to authenticated;
