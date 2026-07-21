-- Private accounts: following becomes a request the owner approves.
--
-- The follow itself keeps living in public.follows, so every existing query
-- ("is the viewer a follower?") keeps working untouched. A request is a
-- separate, pending row that turns into a follow only on approval.

alter table public.profiles
  add column if not exists is_private boolean not null default false;

create table public.follow_requests (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz(6) not null default now(),
  primary key (requester_id, target_id),
  constraint follow_requests_not_self check (requester_id <> target_id)
);

create index follow_requests_target_created_idx
  on public.follow_requests(target_id, created_at desc);

alter table public.follow_requests enable row level security;
grant select on public.follow_requests to authenticated;
grant all privileges on public.follow_requests to service_role;

-- Both sides of a request can see it: the owner to decide, the requester to
-- know it is still pending.
create policy "follow_requests_participants_read"
  on public.follow_requests for select to authenticated
  using (auth.uid() = target_id or auth.uid() = requester_id);

-- Following a private account creates a request instead. Returns the state the
-- caller ended in, so the button knows what to show without a second query.
create or replace function public.request_follow(target_profile uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare target_private boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if auth.uid() = target_profile then
    raise exception 'cannot follow yourself' using errcode = '22023';
  end if;
  if public.users_blocked(auth.uid(), target_profile) then
    raise exception 'interaction unavailable' using errcode = '42501';
  end if;

  select is_private into target_private
  from public.profiles where id = target_profile;
  if target_private is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if exists(
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target_profile
  ) then
    return 'following';
  end if;

  if not target_private then
    insert into public.follows(follower_id, following_id)
    values (auth.uid(), target_profile)
    on conflict do nothing;
    return 'following';
  end if;

  insert into public.follow_requests(requester_id, target_id)
  values (auth.uid(), target_profile)
  on conflict do nothing;
  return 'requested';
end;
$$;

create or replace function public.cancel_follow_request(target_profile uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  delete from public.follow_requests
  where requester_id = auth.uid() and target_id = target_profile;
  return true;
end;
$$;

-- Only the owner decides. Approving is what actually creates the follow.
create or replace function public.review_follow_request(
  requester uuid,
  approve boolean
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not exists(
    select 1 from public.follow_requests
    where requester_id = requester and target_id = auth.uid()
  ) then
    return false;
  end if;

  delete from public.follow_requests
  where requester_id = requester and target_id = auth.uid();

  if approve then
    insert into public.follows(follower_id, following_id)
    values (requester, auth.uid())
    on conflict do nothing;
  end if;
  return true;
end;
$$;

-- Turning an account private does not evict existing followers, the same way
-- it works elsewhere; it only gates new ones. Turning it public clears any
-- pending requests, since they would otherwise sit there with nothing to
-- approve.
create or replace function public.set_profile_privacy(private boolean)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.profiles
  set is_private = private, updated_at = now()
  where id = auth.uid();

  if not private then
    insert into public.follows(follower_id, following_id)
    select requester_id, target_id from public.follow_requests
    where target_id = auth.uid()
    on conflict do nothing;
    delete from public.follow_requests where target_id = auth.uid();
  end if;
  return true;
end;
$$;

-- A direct insert would bypass the privacy check, so following now goes
-- through request_follow only.
drop policy if exists "follows_owner_insert" on public.follows;
drop policy if exists "follows_insert_not_blocked" on public.follows;

revoke insert on public.follows from authenticated;

revoke all on function public.request_follow(uuid) from public, anon;
revoke all on function public.cancel_follow_request(uuid) from public, anon;
revoke all on function public.review_follow_request(uuid, boolean)
  from public, anon;
revoke all on function public.set_profile_privacy(boolean) from public, anon;

grant execute on function public.request_follow(uuid) to authenticated;
grant execute on function public.cancel_follow_request(uuid) to authenticated;
grant execute on function public.review_follow_request(uuid, boolean)
  to authenticated;
grant execute on function public.set_profile_privacy(boolean) to authenticated;
