-- Adds moderator screenshot removal. Before this, the moderation console could
-- only act on profile comments — screenshot reports had no way to actually
-- remove the offending content, forcing mods to ban the author or ignore the
-- report. This RPC mirrors moderate_profile_comment: it soft-deletes the
-- screenshot (blanks the description + marks deleted_at), resolves the report,
-- writes an audit entry, and notifies the author.

alter table public.screenshots
  add column if not exists deleted_at timestamptz(6);

alter table public.moderation_actions
  drop constraint if exists moderation_actions_type_check;
alter table public.moderation_actions
  add constraint moderation_actions_type_check check (
    action in (
      'REPORT_REVIEWING',
      'REPORT_RESOLVED',
      'REPORT_DISMISSED',
      'USER_BANNED',
      'USER_UNBANNED',
      'USER_VERIFIED',
      'USER_UNVERIFIED',
      'COMMENT_REMOVED',
      'SCREENSHOT_REMOVED'
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
      'profile_comment',
      'profile_comment_like',
      'screenshot_like',
      'screenshot_comment',
      'screenshot_comment_like',
      'moderation_comment_removed',
      'moderation_screenshot_removed'
    )
  );

create or replace function public.moderate_screenshot(
  target_screenshot uuid,
  reason text default null,
  target_report uuid default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  shot public.screenshots;
  clean_reason text := nullif(trim(reason), '');
begin
  if not (select private.is_moderator()) then
    raise exception 'moderator access required' using errcode = '42501';
  end if;
  if char_length(coalesce(clean_reason, '')) > 1000 then
    raise exception 'moderation reason too long' using errcode = '22023';
  end if;

  select * into shot
  from public.screenshots
  where id = target_screenshot
  for update;
  if shot.id is null then
    raise exception 'screenshot not found' using errcode = 'P0002';
  end if;
  perform private.assert_moderation_target(shot.profile_id);
  if shot.deleted_at is not null then return false; end if;

  update public.screenshots
  set description = null, deleted_at = now(), updated_at = now()
  where id = target_screenshot;
  delete from public.content_likes
  where content_type = 'screenshot' and content_id = target_screenshot;

  if target_report is not null then
    update public.reports
    set
      status = 'RESOLVED',
      reviewed_by = auth.uid(),
      moderator_note = clean_reason,
      reviewed_at = now(),
      updated_at = now()
    where id = target_report
      and content_type = 'SCREENSHOT'
      and content_id = target_screenshot;
  end if;

  insert into public.moderation_actions(
    moderator_id, target_profile_id, report_id, action, reason, metadata
  ) values (
    auth.uid(),
    shot.profile_id,
    target_report,
    'SCREENSHOT_REMOVED',
    clean_reason,
    jsonb_build_object(
      'screenshot_id', target_screenshot,
      'igdb_id', shot.igdb_id
    )
  );

  insert into public.notifications(
    recipient_id, actor_id, kind, target_id, target_title
  ) values (
    shot.profile_id,
    auth.uid(),
    'moderation_screenshot_removed',
    target_screenshot,
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

revoke all on function public.moderate_screenshot(uuid, text, uuid)
  from public, anon;
grant execute on function public.moderate_screenshot(uuid, text, uuid)
  to authenticated;
