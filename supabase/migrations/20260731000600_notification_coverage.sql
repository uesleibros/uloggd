-- Notifications reach every post kind.
--
-- Four gaps, three of them holes and one a regression:
--
-- 1. Liking a journal entry notified nobody: the like trigger had no `diary`
--    branch at all.
-- 2. Liking a comment notified only when the comment sat under a screenshot;
--    the branch filtered `content_type = 'screenshot'`.
-- 3. Commenting notified only on screenshots, because the comment trigger
--    returns early for every other content type.
-- 4. Liking a profile comment computed its kind and was then dropped in
--    silence: `notification_preference_enabled` was rewritten in the
--    screenshot pass and lost the `profile_comment_like` case, so it fell
--    through to `else false`. Nothing errors, nothing logs, the row is just
--    never written.
--
-- The `else false` default is what made the fourth one invisible, so the
-- rewritten function below lists every kind the check constraint allows and
-- the two are meant to be read together.

alter table public.notification_preferences
  add column if not exists journal_likes_enabled boolean not null default true;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'follow', 'review_like', 'list_like', 'profile_comment',
    'profile_comment_like', 'screenshot_like', 'screenshot_comment',
    'screenshot_comment_like', 'moderation_comment_removed',
    'journal_like', 'post_comment', 'post_comment_like'
  )
);

create or replace function public.notification_preference_enabled(
  owner_id uuid,
  preference_kind text
)
returns boolean language sql stable security definer set search_path = '' as $$
  select case preference_kind
    when 'follow' then coalesce(p.follows_enabled, true)
    when 'review_like' then coalesce(p.review_likes_enabled, true)
    when 'list_like' then coalesce(p.list_likes_enabled, true)
    when 'journal_like' then coalesce(p.journal_likes_enabled, true)
    when 'profile_comment' then coalesce(p.comments_enabled, true)
    when 'profile_comment_like' then coalesce(p.comments_enabled, true)
    when 'post_comment' then coalesce(p.comments_enabled, true)
    when 'post_comment_like' then coalesce(p.comments_enabled, true)
    when 'screenshot_like' then coalesce(p.screenshots_enabled, true)
    when 'screenshot_comment' then coalesce(p.screenshots_enabled, true)
    when 'screenshot_comment_like' then coalesce(p.screenshots_enabled, true)
    when 'moderation_comment_removed' then true
    else false end
  from (select 1) seed
  left join public.notification_preferences p on p.profile_id = owner_id
$$;

create or replace function public.notify_content_like_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_kind text;
declare owner_id uuid;
declare event_title text;
declare event_content_type text;
declare event_content_id uuid;
declare event_actor_id uuid;
declare parent_type text;
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

  if event_content_type = 'review' then
    event_kind := 'review_like';
    select profile_id, coalesce(nullif(title, ''), game_slug)
      into owner_id, event_title
      from public.reviews where id = event_content_id;
  elsif event_content_type = 'list' then
    event_kind := 'list_like';
    select profile_id, name into owner_id, event_title
      from public.game_lists where id = event_content_id;
  elsif event_content_type = 'diary' then
    event_kind := 'journal_like';
    select profile_id, game_slug into owner_id, event_title
      from public.diary_entries where id = event_content_id;
  elsif event_content_type = 'screenshot' then
    event_kind := 'screenshot_like';
    select profile_id, game_slug into owner_id, event_title
      from public.screenshots where id = event_content_id;
  elsif event_content_type = 'profile_comment' then
    event_kind := 'profile_comment_like';
    select author_id, left(body, 80) into owner_id, event_title
      from public.profile_comments where id = event_content_id;
  elsif event_content_type = 'content_comment' then
    -- A comment's like is named after the post it hangs under, so the reader
    -- knows where to go. Screenshots keep their own kind because the inbox
    -- already routes it.
    select author_id, left(body, 80), content_type
      into owner_id, event_title, parent_type
      from public.content_comments where id = event_content_id;
    if parent_type = 'screenshot' then
      event_kind := 'screenshot_comment_like';
    elsif parent_type in ('review', 'list', 'diary') then
      event_kind := 'post_comment_like';
    end if;
  end if;

  if event_kind is null or owner_id is null or owner_id = event_actor_id then
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
        created_at = excluded.created_at,
        read_at = null,
        target_title = excluded.target_title;
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

-- Replaces the screenshot-only comment trigger. Same behaviour for
-- screenshots, extended to every other post kind.
create or replace function public.notify_content_comment_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare destination uuid;
declare event_kind text;
begin
  if new.content_type not in ('screenshot', 'review', 'list', 'diary') then
    return new;
  end if;
  event_kind := case
    when new.content_type = 'screenshot' then 'screenshot_comment'
    else 'post_comment'
  end;

  if new.parent_id is null then
    -- A top-level comment reaches the post's author.
    if new.content_type = 'screenshot' then
      select profile_id into destination from public.screenshots where id = new.content_id;
    elsif new.content_type = 'review' then
      select profile_id into destination from public.reviews where id = new.content_id;
    elsif new.content_type = 'list' then
      select profile_id into destination from public.game_lists where id = new.content_id;
    else
      select profile_id into destination from public.diary_entries where id = new.content_id;
    end if;
  else
    -- A reply reaches the comment it answers.
    select author_id into destination from public.content_comments where id = new.parent_id;
  end if;

  if destination is not null and destination <> new.author_id
    and public.notification_preference_enabled(destination, event_kind) then
    insert into public.notifications(
      recipient_id, actor_id, kind, target_id, target_title
    ) values (
      destination, new.author_id, event_kind, new.id, left(new.body, 80)
    )
    on conflict (recipient_id, actor_id, kind, target_id)
    do update set
      created_at = excluded.created_at,
      read_at = null,
      target_title = excluded.target_title;
  end if;
  return new;
end;
$$;

drop trigger if exists screenshot_comment_notification_activity on public.content_comments;
drop trigger if exists content_comment_notification_activity on public.content_comments;
create trigger content_comment_notification_activity
after insert on public.content_comments
for each row execute function public.notify_content_comment_activity();

revoke all on function public.notify_content_comment_activity() from public, anon, authenticated;
