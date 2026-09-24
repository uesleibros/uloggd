-- Moderation could not take down a post.
--
-- Comments and screenshots had removal functions; a review, a session and a
-- list did not, although all three can be reported. So the only answer to an
-- account posting forty reviews of nothing was to ban the account and leave
-- the forty reviews up, which is what the front page then showed. These are
-- the same shape as the two that existed: check the caller is staff and may
-- act on that author, delete the row, resolve the report if one came with it,
-- write the audit line, and tell the author why.
--
-- A hard delete, because that is what the author's own delete does for these
-- three: there is no `deleted_at` on them and nothing reads a tombstone. The
-- review's rating is carried on the library card, so removing one takes the
-- rating off the card exactly as `delete_review` does.

alter table public.moderation_actions
  drop constraint if exists moderation_actions_type_check;
alter table public.moderation_actions
  add constraint moderation_actions_type_check check (
    action in (
      'REPORT_REVIEWING',
      'REPORT_RESOLVED',
      'REPORT_DISMISSED',
      'USER_WARNED',
      'USER_BANNED',
      'USER_UNBANNED',
      'USER_VERIFIED',
      'USER_UNVERIFIED',
      'USER_ORG_REVOKED',
      'COMMENT_REMOVED',
      'SCREENSHOT_REMOVED',
      'REVIEW_REMOVED',
      'ENTRY_REMOVED',
      'LIST_REMOVED'
    )
  );

alter table public.notifications
  drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (
    kind in (
      'follow',
      'review_like',
      'list_like',
      'journal_like',
      'profile_comment',
      'profile_comment_like',
      'post_comment',
      'post_comment_like',
      'screenshot_like',
      'screenshot_comment',
      'screenshot_comment_like',
      'mineral_transfer',
      'moderation_comment_removed',
      'moderation_screenshot_removed',
      'moderation_review_removed',
      'moderation_entry_removed',
      'moderation_list_removed',
      'moderation_warning',
      'moderation_suspended',
      'moderation_reinstated'
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
    when 'mineral_transfer' then true
    when 'moderation_comment_removed' then true
    when 'moderation_screenshot_removed' then true
    when 'moderation_review_removed' then true
    when 'moderation_entry_removed' then true
    when 'moderation_list_removed' then true
    when 'moderation_warning' then true
    when 'moderation_suspended' then true
    when 'moderation_reinstated' then true
    else false end
  from (select 1) seed
  left join public.notification_preferences p on p.profile_id = owner_id
$$;

-- One function for the three, because they differ only in which table the row
-- is in. `kind` is checked against the same words the reports table uses.
create or replace function public.moderate_post(
  post_kind text,
  target_post uuid,
  reason text default null,
  target_report uuid default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  author uuid;
  game integer;
  clean_reason text := nullif(trim(reason), '');
  notice text;
  logged text;
begin
  if not (select private.is_moderator()) then
    raise exception 'moderator access required' using errcode = '42501';
  end if;
  if post_kind not in ('REVIEW', 'DIARY', 'LIST') then
    raise exception 'invalid content kind' using errcode = '22023';
  end if;
  if char_length(coalesce(clean_reason, '')) > 1000 then
    raise exception 'moderation reason too long' using errcode = '22023';
  end if;

  if post_kind = 'REVIEW' then
    select profile_id, igdb_id into author, game
    from public.reviews where id = target_post for update;
    notice := 'moderation_review_removed';
    logged := 'REVIEW_REMOVED';
  elsif post_kind = 'DIARY' then
    select profile_id into author
    from public.diary_entries where id = target_post for update;
    notice := 'moderation_entry_removed';
    logged := 'ENTRY_REMOVED';
  else
    select profile_id into author
    from public.game_lists where id = target_post for update;
    notice := 'moderation_list_removed';
    logged := 'LIST_REMOVED';
  end if;

  if author is null then
    raise exception 'content not found' using errcode = 'P0002';
  end if;
  perform private.assert_moderation_target(author);

  if post_kind = 'REVIEW' then
    delete from public.reviews where id = target_post;
    -- The score the review put on the library card goes with it, the way it
    -- does when the author deletes their own.
    update public.user_games set quick_rating = null, updated_at = now()
    where profile_id = author and igdb_id = game;
  elsif post_kind = 'DIARY' then
    delete from public.diary_entries where id = target_post;
  else
    delete from public.game_lists where id = target_post;
  end if;

  if target_report is not null then
    update public.reports
    set
      status = 'RESOLVED',
      reviewed_by = auth.uid(),
      moderator_note = clean_reason,
      reviewed_at = now(),
      updated_at = now()
    where id = target_report and content_id = target_post;
  end if;

  insert into public.moderation_actions(
    moderator_id, target_profile_id, report_id, action, reason, metadata
  ) values (
    auth.uid(), author, target_report, logged, clean_reason,
    jsonb_build_object('content_id', target_post, 'kind', post_kind)
  );

  insert into public.notifications(
    recipient_id, actor_id, kind, target_id, target_title
  ) values (
    author, auth.uid(), notice, target_post,
    coalesce(clean_reason, 'Removido por violar as regras da comunidade.')
  )
  on conflict (recipient_id, actor_id, kind, target_id)
    do update set
      target_title = excluded.target_title,
      created_at = excluded.created_at,
      read_at = null;
  return true;
end;
$$;

revoke all on function public.moderate_post(text, uuid, text, uuid)
  from public, anon;
grant execute on function public.moderate_post(text, uuid, text, uuid)
  to authenticated;

-- The account's content list, now carrying everything it can post rather than
-- only what could already be removed. A review is the thing most often
-- reported and was the one thing missing from this list.
create or replace function public.moderation_account_content(
  target_profile uuid,
  max_rows integer default 24
)
returns table (
  kind text,
  id uuid,
  body text,
  context text,
  created_at timestamptz,
  removed boolean
)
language sql stable security definer set search_path = ''
as $$
  select written.kind, written.id, written.body, written.context,
         written.created_at, written.removed
  from (
    select
      'REVIEW'::text as kind,
      review.id,
      coalesce(nullif(review.title, ''), review.content, '')::text as body,
      review.game_slug::text as context,
      review.created_at::timestamptz as created_at,
      false as removed
    from public.reviews review
    where review.profile_id = target_profile
    union all
    select
      'DIARY'::text,
      entry.id,
      coalesce(entry.note, '')::text,
      entry.game_slug::text,
      entry.created_at::timestamptz,
      false
    from public.diary_entries entry
    where entry.profile_id = target_profile
    union all
    select
      'LIST'::text,
      list.id,
      list.name::text,
      coalesce(list.description, '')::text,
      list.created_at::timestamptz,
      false
    from public.game_lists list
    where list.profile_id = target_profile
    union all
    select
      'PROFILE_COMMENT'::text,
      comment.id,
      comment.body::text,
      coalesce('@' || wall.username, '')::text,
      comment.created_at::timestamptz,
      comment.deleted_at is not null
    from public.profile_comments comment
    join public.profiles wall on wall.id = comment.profile_id
    where comment.author_id = target_profile
    union all
    select
      'CONTENT_COMMENT'::text,
      comment.id,
      comment.body::text,
      comment.content_type::text,
      comment.created_at::timestamptz,
      comment.deleted_at is not null
    from public.content_comments comment
    where comment.author_id = target_profile
    union all
    select
      'SCREENSHOT'::text,
      shot.id,
      coalesce(shot.description, '')::text,
      shot.game_slug::text,
      shot.created_at::timestamptz,
      shot.deleted_at is not null
    from public.screenshots shot
    where shot.profile_id = target_profile
  ) written
  where (select private.is_moderator())
  order by written.created_at desc
  limit least(greatest(coalesce(max_rows, 24), 1), 50)
$$;

revoke all on function public.moderation_account_content(uuid, integer)
  from public, anon;
grant execute on function public.moderation_account_content(uuid, integer)
  to authenticated;
