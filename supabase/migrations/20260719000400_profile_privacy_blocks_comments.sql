-- Profile privacy, enforceable blocking, and protected profile comments.

alter table public.profiles
  add column if not exists profile_comment_scope text not null default 'FOLLOWERS',
  add constraint profiles_comment_scope_check
    check (profile_comment_scope in ('EVERYONE', 'FOLLOWERS', 'NOBODY'));

create function public.users_blocked(first_user uuid, second_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select first_user is not null and second_user is not null and exists (
    select 1 from public.blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  )
$$;

create function public.get_profile_block_state(target_profile uuid)
returns table(viewer_blocked boolean, blocked_by_target boolean)
language sql stable security definer set search_path = ''
as $$
  select
    exists(select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = target_profile),
    exists(select 1 from public.blocks where blocker_id = target_profile and blocked_id = auth.uid())
$$;

create function public.block_profile(target_profile uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_profile = auth.uid() then raise exception 'cannot block yourself' using errcode = '22023'; end if;
  if not exists(select 1 from public.profiles where id = target_profile) then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  insert into public.blocks(blocker_id, blocked_id)
  values(auth.uid(), target_profile)
  on conflict do nothing;
  delete from public.follows
  where (follower_id = auth.uid() and following_id = target_profile)
     or (follower_id = target_profile and following_id = auth.uid());
  delete from public.notifications
  where (recipient_id = auth.uid() and actor_id = target_profile)
     or (recipient_id = target_profile and actor_id = auth.uid());
  return true;
end;
$$;

create function public.unblock_profile(target_profile uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare removed boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = target_profile;
  removed := found;
  return removed;
end;
$$;

drop policy if exists "follows_owner_insert" on public.follows;
create policy "follows_owner_insert" on public.follows for insert to authenticated
with check (
  auth.uid() = follower_id
  and not public.users_blocked(follower_id, following_id)
);
revoke insert, delete on public.blocks from authenticated;

drop policy if exists "reviews_visible_read" on public.reviews;
create policy "reviews_visible_read" on public.reviews for select to anon, authenticated
using (
  not public.users_blocked(auth.uid(), profile_id)
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
  not public.users_blocked(auth.uid(), profile_id)
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
  not public.users_blocked(auth.uid(), profile_id)
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
  not public.users_blocked(auth.uid(), profile_id)
  and (
    profile_id = auth.uid() or exists (
      select 1 from public.profiles
      where profiles.id = user_games.profile_id
        and profiles.library_visibility = 'PUBLIC'
    )
  )
);

create table public.profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body varchar(500) not null,
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  constraint profile_comments_body_check
    check (char_length(trim(body)) between 1 and 500)
);
create index profile_comments_profile_created_idx
  on public.profile_comments(profile_id, created_at desc);
create index profile_comments_author_created_idx
  on public.profile_comments(author_id, created_at desc);
create unique index reports_one_open_profile_comment_idx
  on public.reports(reporter_id, content_id)
  where content_type = 'PROFILE_COMMENT' and status in ('OPEN', 'REVIEWING');

alter table public.profile_comments enable row level security;
create policy "profile_comments_visible_read"
  on public.profile_comments for select to anon, authenticated
  using (not public.users_blocked(auth.uid(), author_id)
    and not public.users_blocked(auth.uid(), profile_id));
create policy "profile_comments_author_or_owner_delete"
  on public.profile_comments for delete to authenticated
  using (auth.uid() = author_id or auth.uid() = profile_id);

grant select on public.profile_comments to anon, authenticated;
grant delete on public.profile_comments to authenticated;
grant all privileges on public.profile_comments to service_role;

create function public.create_profile_comment(target_profile uuid, comment_body text)
returns public.profile_comments
language plpgsql security definer set search_path = ''
as $$
declare target_scope text;
declare result public.profile_comments;
declare clean_body text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  clean_body := trim(comment_body);
  if char_length(clean_body) not between 1 and 500 or clean_body ~ '[[:cntrl:]]' then
    raise exception 'invalid comment' using errcode = '22023';
  end if;
  if public.users_blocked(auth.uid(), target_profile) then
    raise exception 'interaction unavailable' using errcode = '42501';
  end if;
  select profile_comment_scope into target_scope
  from public.profiles where id = target_profile;
  if target_scope is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  if target_scope = 'NOBODY'
    or (target_scope = 'FOLLOWERS' and auth.uid() <> target_profile and not exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = target_profile
    ))
  then raise exception 'comments unavailable' using errcode = '42501'; end if;
  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 minute') >= 5
  then raise exception 'comment rate limit' using errcode = 'P0001'; end if;
  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 day') >= 40
  then raise exception 'daily comment limit' using errcode = 'P0001'; end if;

  insert into public.profile_comments(profile_id, author_id, body)
  values(target_profile, auth.uid(), clean_body)
  returning * into result;
  return result;
end;
$$;

create function public.set_profile_comment_scope(new_scope text)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if new_scope not in ('EVERYONE', 'FOLLOWERS', 'NOBODY') then
    raise exception 'invalid comment scope' using errcode = '22023';
  end if;
  update public.profiles
  set profile_comment_scope = new_scope, updated_at = now()
  where id = auth.uid();
  return new_scope;
end;
$$;

revoke all on function public.users_blocked(uuid,uuid) from public, anon, authenticated;
revoke all on function public.get_profile_block_state(uuid) from public, anon;
revoke all on function public.block_profile(uuid) from public, anon;
revoke all on function public.unblock_profile(uuid) from public, anon;
revoke all on function public.create_profile_comment(uuid,text) from public, anon;
revoke all on function public.set_profile_comment_scope(text) from public, anon;
grant execute on function public.get_profile_block_state(uuid) to authenticated;
grant execute on function public.block_profile(uuid) to authenticated;
grant execute on function public.unblock_profile(uuid) to authenticated;
grant execute on function public.create_profile_comment(uuid,text) to authenticated;
grant execute on function public.set_profile_comment_scope(text) to authenticated;
