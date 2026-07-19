-- Threaded profile conversations with safe editing and soft deletion.

alter table public.profile_comments
  add column parent_id uuid references public.profile_comments(id) on delete cascade,
  add column deleted_at timestamptz(6);

create index profile_comments_parent_created_idx
  on public.profile_comments(parent_id, created_at);

alter table public.profile_comments
  drop constraint profile_comments_body_check;
alter table public.profile_comments
  add constraint profile_comments_body_check check (
    (deleted_at is not null and body = '')
    or (deleted_at is null and char_length(trim(body)) between 1 and 500)
  );

revoke delete on public.profile_comments from authenticated;
drop policy if exists "profile_comments_author_or_owner_delete"
  on public.profile_comments;

drop function if exists public.create_profile_comment(uuid,text);
create function public.create_profile_comment(
  target_profile uuid,
  comment_body text,
  parent_comment uuid default null
)
returns public.profile_comments
language plpgsql security definer set search_path = ''
as $$
declare target_scope text;
declare result public.profile_comments;
declare clean_body text;
declare parent_row public.profile_comments;
declare thread_depth integer;
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

  if parent_comment is not null then
    select * into parent_row from public.profile_comments
    where id = parent_comment and profile_id = target_profile;
    if parent_row.id is null or parent_row.deleted_at is not null then
      raise exception 'parent comment not found' using errcode = 'P0002';
    end if;
    with recursive ancestors as (
      select id, parent_id, 1 as depth
      from public.profile_comments where id = parent_comment
      union all
      select parent.id, parent.parent_id, ancestors.depth + 1
      from public.profile_comments parent
      join ancestors on parent.id = ancestors.parent_id
      where ancestors.depth < 8
    )
    select max(depth) into thread_depth from ancestors;
    if coalesce(thread_depth, 0) >= 6 then
      raise exception 'thread depth limit' using errcode = '22023';
    end if;
  end if;

  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 minute') >= 5
  then raise exception 'comment rate limit' using errcode = 'P0001'; end if;
  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 day') >= 40
  then raise exception 'daily comment limit' using errcode = 'P0001'; end if;

  insert into public.profile_comments(profile_id, author_id, body, parent_id)
  values(target_profile, auth.uid(), clean_body, parent_comment)
  returning * into result;
  return result;
end;
$$;

create function public.update_profile_comment(
  target_comment uuid,
  comment_body text
)
returns public.profile_comments
language plpgsql security definer set search_path = ''
as $$
declare result public.profile_comments;
declare clean_body text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  clean_body := trim(comment_body);
  if char_length(clean_body) not between 1 and 500 or clean_body ~ '[[:cntrl:]]' then
    raise exception 'invalid comment' using errcode = '22023';
  end if;
  update public.profile_comments
  set body = clean_body, updated_at = now()
  where id = target_comment and author_id = auth.uid() and deleted_at is null
  returning * into result;
  if result.id is null then raise exception 'comment not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create function public.delete_profile_comment(target_comment uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.profile_comments
  set body = '', deleted_at = now(), updated_at = now()
  where id = target_comment
    and deleted_at is null
    and (author_id = auth.uid() or profile_id = auth.uid());
  return found;
end;
$$;

create or replace function public.notify_profile_comment_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare destination uuid;
begin
  if new.parent_id is not null then
    select author_id into destination
    from public.profile_comments where id = new.parent_id;
  end if;
  destination := coalesce(destination, new.profile_id);
  if destination <> new.author_id
    and public.notification_preference_enabled(destination, 'profile_comment')
  then
    insert into public.notifications(
      recipient_id, actor_id, kind, target_id, target_title
    ) values (
      destination, new.author_id, 'profile_comment', new.id, left(new.body, 80)
    )
    on conflict (recipient_id, actor_id, kind, target_id)
      do update set created_at = excluded.created_at, read_at = null;
  end if;
  return new;
end;
$$;

revoke all on function public.create_profile_comment(uuid,text,uuid)
  from public, anon;
revoke all on function public.update_profile_comment(uuid,text)
  from public, anon;
revoke all on function public.delete_profile_comment(uuid)
  from public, anon;
grant execute on function public.create_profile_comment(uuid,text,uuid)
  to authenticated;
grant execute on function public.update_profile_comment(uuid,text)
  to authenticated;
grant execute on function public.delete_profile_comment(uuid)
  to authenticated;
