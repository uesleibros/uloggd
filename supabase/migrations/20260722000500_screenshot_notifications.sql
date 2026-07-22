-- Screenshots participate in the same private notification contract as the
-- other community posts: likes, comments, replies and comment likes.

alter table public.notification_preferences
  add column if not exists screenshots_enabled boolean not null default true;

-- Screenshot comment access is account-wide and lives in Privacy settings.
-- Clear the short-lived per-post overrides introduced by the previous build.
update public.screenshots set comments_scope = 'EVERYONE'
where comments_scope <> 'EVERYONE';

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'follow', 'review_like', 'list_like', 'profile_comment',
    'profile_comment_like', 'screenshot_like', 'screenshot_comment',
    'screenshot_comment_like', 'moderation_comment_removed'
  )
);

create or replace function public.notification_preference_enabled(owner_id uuid, preference_kind text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case preference_kind
    when 'follow' then coalesce(p.follows_enabled, true)
    when 'review_like' then coalesce(p.review_likes_enabled, true)
    when 'list_like' then coalesce(p.list_likes_enabled, true)
    when 'profile_comment' then coalesce(p.comments_enabled, true)
    when 'screenshot_like' then coalesce(p.screenshots_enabled, true)
    when 'screenshot_comment' then coalesce(p.screenshots_enabled, true)
    when 'screenshot_comment_like' then coalesce(p.screenshots_enabled, true)
    else false end
  from (select 1) seed
  left join public.notification_preferences p on p.profile_id = owner_id
$$;

create or replace function public.notify_content_like_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
declare event_kind text;
declare event_title text;
declare event_content_type text;
declare event_content_id uuid;
declare event_actor_id uuid;
begin
  if tg_op = 'INSERT' then
    event_content_type := new.content_type; event_content_id := new.content_id; event_actor_id := new.profile_id;
  else
    event_content_type := old.content_type; event_content_id := old.content_id; event_actor_id := old.profile_id;
  end if;
  if event_content_type = 'review' then
    event_kind := 'review_like';
    select profile_id, coalesce(nullif(title, ''), game_slug) into owner_id, event_title from public.reviews where id = event_content_id;
  elsif event_content_type = 'list' then
    event_kind := 'list_like';
    select profile_id, name into owner_id, event_title from public.game_lists where id = event_content_id;
  elsif event_content_type = 'profile_comment' then
    event_kind := 'profile_comment_like';
    select author_id, left(body, 80) into owner_id, event_title from public.profile_comments where id = event_content_id;
  elsif event_content_type = 'screenshot' then
    event_kind := 'screenshot_like';
    select profile_id, game_slug into owner_id, event_title from public.screenshots where id = event_content_id;
  elsif event_content_type = 'content_comment' then
    select author_id, left(body, 80) into owner_id, event_title
      from public.content_comments where id = event_content_id and content_type = 'screenshot';
    if owner_id is not null then event_kind := 'screenshot_comment_like'; end if;
  end if;
  if event_kind is null or owner_id is null or owner_id = event_actor_id then
    if tg_op = 'INSERT' then return new; else return old; end if;
  end if;
  if tg_op = 'INSERT' then
    if public.notification_preference_enabled(owner_id, event_kind) then
      insert into public.notifications(recipient_id, actor_id, kind, target_id, target_title)
      values(owner_id, event_actor_id, event_kind, event_content_id, event_title)
      on conflict (recipient_id, actor_id, kind, target_id)
      do update set created_at = excluded.created_at, read_at = null, target_title = excluded.target_title;
    end if;
    return new;
  end if;
  delete from public.notifications where recipient_id = owner_id and actor_id = event_actor_id
    and kind = event_kind and target_id = event_content_id;
  return old;
end;
$$;

create or replace function public.notify_screenshot_comment_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare destination uuid;
begin
  if new.content_type <> 'screenshot' then return new; end if;
  if new.parent_id is null then
    select profile_id into destination from public.screenshots where id = new.content_id;
  else
    select author_id into destination from public.content_comments where id = new.parent_id;
  end if;
  if destination is not null and destination <> new.author_id
    and public.notification_preference_enabled(destination, 'screenshot_comment') then
    insert into public.notifications(recipient_id, actor_id, kind, target_id, target_title)
    values(destination, new.author_id, 'screenshot_comment', new.id, left(new.body, 80))
    on conflict (recipient_id, actor_id, kind, target_id)
    do update set created_at = excluded.created_at, read_at = null, target_title = excluded.target_title;
  end if;
  return new;
end;
$$;

drop trigger if exists screenshot_comment_notification_activity on public.content_comments;
create trigger screenshot_comment_notification_activity after insert on public.content_comments
for each row execute function public.notify_screenshot_comment_activity();

create or replace function public.cleanup_screenshot_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where
    (kind = 'screenshot_like' and target_id = old.id)
    or (kind in ('screenshot_comment', 'screenshot_comment_like') and target_id in (
      select id from public.content_comments where content_type = 'screenshot' and content_id = old.id
    ));
  delete from public.content_likes where
    (content_type = 'screenshot' and content_id = old.id)
    or (content_type = 'content_comment' and content_id in (
      select id from public.content_comments where content_type = 'screenshot' and content_id = old.id
    ));
  delete from public.content_comments where content_type = 'screenshot' and content_id = old.id;
  return old;
end;
$$;
drop trigger if exists cleanup_screenshot_notifications on public.screenshots;
create trigger cleanup_screenshot_notifications before delete on public.screenshots
for each row execute function public.cleanup_screenshot_notifications();

revoke all on function public.notify_screenshot_comment_activity() from public, anon, authenticated;
revoke all on function public.cleanup_screenshot_notifications() from public, anon, authenticated;
