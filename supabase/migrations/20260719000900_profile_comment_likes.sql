-- Lightweight likes for profile conversation threads.

alter table public.content_likes
  drop constraint if exists content_likes_type_check;
alter table public.content_likes
  add constraint content_likes_type_check
    check (content_type in ('review', 'diary', 'list', 'profile_comment'));

alter table public.notifications
  drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
    check (
      kind in (
        'follow',
        'review_like',
        'list_like',
        'profile_comment',
        'profile_comment_like'
      )
    );

create or replace function public.toggle_content_like(
  target_type text,
  target_id uuid
)
returns table(liked boolean, like_count bigint)
language plpgsql security definer set search_path = ''
as $$
declare visible boolean;
declare now_liked boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if target_type not in ('review', 'diary', 'list', 'profile_comment') then
    raise exception 'invalid content type' using errcode = '22023';
  end if;

  if target_type = 'review' then
    select exists(
      select 1 from public.reviews r
      where r.id = target_id and r.profile_id <> auth.uid() and (
        r.visibility = 'PUBLIC'
        or (
          r.visibility = 'FOLLOWERS'
          and exists(
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.following_id = r.profile_id
          )
        )
      )
    ) into visible;
  elsif target_type = 'diary' then
    select exists(
      select 1 from public.diary_entries d
      where d.id = target_id and d.profile_id <> auth.uid() and (
        d.visibility = 'PUBLIC'
        or (
          d.visibility = 'FOLLOWERS'
          and exists(
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.following_id = d.profile_id
          )
        )
      )
    ) into visible;
  elsif target_type = 'list' then
    select exists(
      select 1 from public.game_lists l
      where l.id = target_id and l.profile_id <> auth.uid() and (
        l.visibility = 'PUBLIC'
        or (
          l.visibility = 'FOLLOWERS'
          and exists(
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.following_id = l.profile_id
          )
        )
      )
    ) into visible;
  else
    select exists(
      select 1
      from public.profile_comments c
      where c.id = target_id
        and c.author_id <> auth.uid()
        and c.deleted_at is null
        and not public.users_blocked(auth.uid(), c.author_id)
        and not public.users_blocked(auth.uid(), c.profile_id)
    ) into visible;
  end if;

  if not visible then
    raise exception 'content not found' using errcode = 'P0002';
  end if;

  delete from public.content_likes
  where profile_id = auth.uid()
    and content_type = target_type
    and content_id = target_id;

  if found then
    now_liked := false;
  else
    insert into public.content_likes(profile_id, content_type, content_id)
    values (auth.uid(), target_type, target_id);
    now_liked := true;
  end if;

  return query
    select now_liked, count(*)::bigint
    from public.content_likes
    where content_type = target_type and content_id = target_id;
end;
$$;

create or replace function public.notify_content_like_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare owner_id uuid;
declare event_kind text;
declare event_title text;
declare event_content_type text;
declare event_content_id uuid;
declare event_actor_id uuid;
begin
  if tg_op = 'INSERT' then
    event_content_type := new.content_type;
    event_content_id := new.content_id;
    event_actor_id := new.profile_id;
  else
    event_content_type := old.content_type;
    event_content_id := old.content_id;
    event_actor_id := old.profile_id;
  end if;

  if event_content_type not in ('review', 'list', 'profile_comment') then
    if tg_op = 'INSERT' then return new; else return old; end if;
  end if;

  if event_content_type = 'review' then
    event_kind := 'review_like';
    select r.profile_id, coalesce(nullif(r.title, ''), r.game_slug)
      into owner_id, event_title
    from public.reviews r where r.id = event_content_id;
  elsif event_content_type = 'list' then
    event_kind := 'list_like';
    select l.profile_id, l.name into owner_id, event_title
    from public.game_lists l where l.id = event_content_id;
  else
    event_kind := 'profile_comment_like';
    select c.author_id, left(c.body, 80) into owner_id, event_title
    from public.profile_comments c
    where c.id = event_content_id and c.deleted_at is null;
  end if;

  if owner_id is null or owner_id = event_actor_id then
    if tg_op = 'INSERT' then return new; else return old; end if;
  end if;

  if tg_op = 'INSERT' then
    if public.notification_preference_enabled(
      owner_id,
      case
        when event_kind = 'profile_comment_like'
          then 'profile_comment'
        else event_kind
      end
    ) then
      insert into public.notifications(
        recipient_id, actor_id, kind, target_id, target_title
      ) values (
        owner_id, event_actor_id, event_kind, event_content_id, event_title
      )
      on conflict (recipient_id, actor_id, kind, target_id)
        do update set
          target_title = excluded.target_title,
          created_at = excluded.created_at,
          read_at = null;
    end if;
    return new;
  end if;

  delete from public.notifications
  where recipient_id = owner_id
    and actor_id = event_actor_id
    and kind = event_kind
    and target_id = event_content_id;
  return old;
end;
$$;

create or replace function public.delete_profile_comment(target_comment uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare removed boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.profile_comments
  set body = '', deleted_at = now(), updated_at = now()
  where id = target_comment
    and deleted_at is null
    and (author_id = auth.uid() or profile_id = auth.uid());
  removed := found;

  if removed then
    delete from public.content_likes
    where content_type = 'profile_comment' and content_id = target_comment;
  end if;

  return removed;
end;
$$;

revoke all on function public.toggle_content_like(text,uuid)
  from public, anon;
grant execute on function public.toggle_content_like(text,uuid)
  to authenticated;
revoke all on function public.delete_profile_comment(uuid)
  from public, anon;
grant execute on function public.delete_profile_comment(uuid)
  to authenticated;
