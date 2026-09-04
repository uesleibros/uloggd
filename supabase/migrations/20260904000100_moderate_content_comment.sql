-- Comments on reviews and lists could be reported but not removed. The console
-- offers the removal button for a profile comment because
-- `moderate_profile_comment` exists; this is its sibling for the other table,
-- written the same way so a moderator does not have to know which kind of
-- comment they are looking at.

create or replace function public.moderate_content_comment(
  target_comment uuid,
  reason text default null,
  target_report uuid default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  comment_row public.content_comments;
  clean_reason text := nullif(trim(reason), '');
begin
  if not (select private.is_moderator()) then
    raise exception 'moderator access required' using errcode = '42501';
  end if;
  if char_length(coalesce(clean_reason, '')) > 1000 then
    raise exception 'moderation reason too long' using errcode = '22023';
  end if;

  select * into comment_row
  from public.content_comments
  where id = target_comment
  for update;
  if comment_row.id is null then
    raise exception 'comment not found' using errcode = 'P0002';
  end if;
  perform private.assert_moderation_target(comment_row.author_id);
  if comment_row.deleted_at is not null then return false; end if;

  -- The body check constraint on this table insists a deleted row is empty, so
  -- the two have to move together.
  update public.content_comments
  set body = '', deleted_at = now(), updated_at = now()
  where id = target_comment;
  delete from public.content_likes
  where content_type = 'content_comment' and content_id = target_comment;

  if target_report is not null then
    update public.reports
    set
      status = 'RESOLVED',
      reviewed_by = auth.uid(),
      moderator_note = clean_reason,
      reviewed_at = now(),
      updated_at = now()
    where id = target_report
      and content_type = 'CONTENT_COMMENT'
      and content_id = target_comment;
  end if;

  insert into public.moderation_actions(
    moderator_id, target_profile_id, report_id, action, reason, metadata
  ) values (
    auth.uid(),
    comment_row.author_id,
    target_report,
    'COMMENT_REMOVED',
    clean_reason,
    jsonb_build_object(
      'comment_id', target_comment,
      'content_type', comment_row.content_type,
      'content_id', comment_row.content_id
    )
  );

  insert into public.notifications(
    recipient_id, actor_id, kind, target_id, target_title
  ) values (
    comment_row.author_id,
    auth.uid(),
    'moderation_comment_removed',
    target_comment,
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

revoke all on function public.moderate_content_comment(uuid, text, uuid)
  from public, anon;
grant execute on function public.moderate_content_comment(uuid, text, uuid)
  to authenticated;
