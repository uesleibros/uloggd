-- Private, in-product notification inbox for social activity.

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  follows_enabled boolean not null default true,
  review_likes_enabled boolean not null default true,
  list_likes_enabled boolean not null default true,
  updated_at timestamptz(6) not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  target_id uuid,
  target_title text,
  created_at timestamptz(6) not null default now(),
  read_at timestamptz(6),
  constraint notifications_kind_check
    check (kind in ('follow', 'review_like', 'list_like')),
  constraint notifications_not_self_check check (recipient_id <> actor_id),
  constraint notifications_event_key
    unique nulls not distinct (recipient_id, actor_id, kind, target_id)
);

create index notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index notifications_recipient_unread_idx
  on public.notifications(recipient_id, created_at desc)
  where read_at is null;

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

create policy "notification_preferences_read_own"
  on public.notification_preferences for select to authenticated
  using (profile_id = auth.uid());
create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert to authenticated
  with check (profile_id = auth.uid());
create policy "notification_preferences_update_own"
  on public.notification_preferences for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "notifications_read_own"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (recipient_id = auth.uid());

grant select, insert, update on public.notification_preferences to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant all privileges on public.notification_preferences, public.notifications to service_role;

create function public.notification_preference_enabled(
  owner_id uuid,
  preference_kind text
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case preference_kind
    when 'follow' then coalesce(p.follows_enabled, true)
    when 'review_like' then coalesce(p.review_likes_enabled, true)
    when 'list_like' then coalesce(p.list_likes_enabled, true)
    else false
  end
  from (select 1) seed
  left join public.notification_preferences p on p.profile_id = owner_id
$$;

create function public.notify_follow_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if public.notification_preference_enabled(new.following_id, 'follow') then
      insert into public.notifications(recipient_id, actor_id, kind)
      values (new.following_id, new.follower_id, 'follow')
      on conflict (recipient_id, actor_id, kind, target_id)
        do update set created_at = excluded.created_at, read_at = null;
    end if;
    return new;
  end if;

  delete from public.notifications
  where recipient_id = old.following_id
    and actor_id = old.follower_id
    and kind = 'follow'
    and target_id is null;
  return old;
end;
$$;

create function public.notify_content_like_activity()
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

  if event_content_type not in ('review', 'list') then
    if tg_op = 'INSERT' then return new; else return old; end if;
  end if;

  if event_content_type = 'review' then
    event_kind := 'review_like';
    select r.profile_id, coalesce(nullif(r.title, ''), r.game_slug)
      into owner_id, event_title
    from public.reviews r
    where r.id = event_content_id;
  else
    event_kind := 'list_like';
    select l.profile_id, l.name into owner_id, event_title
    from public.game_lists l
    where l.id = event_content_id;
  end if;

  if owner_id is null or owner_id = event_actor_id then
    if tg_op = 'INSERT' then return new; else return old; end if;
  end if;

  if tg_op = 'INSERT' then
    if public.notification_preference_enabled(owner_id, event_kind) then
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

create function public.mark_all_notifications_read()
returns void
language sql volatile security invoker set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid() and read_at is null
$$;

create trigger follows_notification_activity
after insert or delete on public.follows
for each row execute function public.notify_follow_activity();

create trigger content_likes_notification_activity
after insert or delete on public.content_likes
for each row execute function public.notify_content_like_activity();

revoke all on function public.notification_preference_enabled(uuid,text) from public, anon, authenticated;
revoke all on function public.notify_follow_activity() from public, anon, authenticated;
revoke all on function public.notify_content_like_activity() from public, anon, authenticated;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;
