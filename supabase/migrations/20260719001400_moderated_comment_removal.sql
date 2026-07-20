-- Auditable staff removal for profile comments, with author notification and
-- a distinct error when a reply races against a removed parent.

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
      'COMMENT_REMOVED'
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
      'moderation_comment_removed'
    )
  );

create or replace function public.moderate_profile_comment(
  target_comment uuid,
  reason text default null,
  target_report uuid default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  comment_row public.profile_comments;
  clean_reason text := nullif(trim(reason), '');
begin
  if not (select private.is_moderator()) then
    raise exception 'moderator access required' using errcode = '42501';
  end if;
  if char_length(coalesce(clean_reason, '')) > 1000 then
    raise exception 'moderation reason too long' using errcode = '22023';
  end if;

  select * into comment_row
  from public.profile_comments
  where id = target_comment
  for update;
  if comment_row.id is null then
    raise exception 'comment not found' using errcode = 'P0002';
  end if;
  perform private.assert_moderation_target(comment_row.author_id);
  if comment_row.deleted_at is not null then return false; end if;

  update public.profile_comments
  set body = '', deleted_at = now(), updated_at = now()
  where id = target_comment;
  delete from public.content_likes
  where content_type = 'profile_comment' and content_id = target_comment;

  if target_report is not null then
    update public.reports
    set
      status = 'RESOLVED',
      reviewed_by = auth.uid(),
      moderator_note = clean_reason,
      reviewed_at = now(),
      updated_at = now()
    where id = target_report
      and content_type = 'PROFILE_COMMENT'
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
      'profile_id', comment_row.profile_id
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

create or replace function public.create_profile_comment(
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
    if parent_row.id is null then
      raise exception 'parent comment not found' using errcode = 'P0002';
    end if;
    if parent_row.deleted_at is not null then
      raise exception 'parent comment removed' using errcode = 'P0002';
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

revoke all on function public.moderate_profile_comment(uuid,text,uuid)
  from public, anon;
grant execute on function public.moderate_profile_comment(uuid,text,uuid)
  to authenticated;
