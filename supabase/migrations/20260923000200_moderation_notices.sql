-- Telling people what moderation did, and reaching content that nobody
-- reported.
--
-- Three things were missing. A screenshot could not be taken down at all:
-- `moderation_screenshot_removed` was dropped from the kind list when journal
-- likes were added and never put back, so every removal reached the
-- notification insert and died on the check constraint, taking the removal
-- with it. An account could only be banned, so the answer to a first offence
-- was either nothing or a suspension. And a ban or an unban left no trace
-- anywhere the person could read: they found out by being unable to open the
-- site.
--
-- The kind list is restated whole because it is a check constraint rather
-- than an enum, and a kind left out of it is not rejected at write time in
-- the abstract: it takes down whatever function was inserting it.

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
      'moderation_warning',
      'moderation_suspended',
      'moderation_reinstated'
    )
  );

-- Every accepted kind needs a delivery preference as well, or the table takes
-- it and the trigger path drops it. Nothing moderation does is opt-out: a
-- decision about your account is not a notification you can decline.
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
    when 'moderation_warning' then true
    when 'moderation_suspended' then true
    when 'moderation_reinstated' then true
    else false end
  from (select 1) seed
  left join public.notification_preferences p on p.profile_id = owner_id
$$;

-- A warning, and a word for the two sanctions that already existed.
--
-- WARN is the action that was missing between doing nothing and taking the
-- account away: it writes an infraction, enters the audit log and tells the
-- person what they did, and it leaves them able to use the site. The ban and
-- the unban now say so too. Each notice hangs off the audit row that caused
-- it, which is what keeps a second warning from overwriting the first: the
-- inbox is unique on (recipient, actor, kind, target), and the target is that
-- row's id.
create or replace function public.moderate_profile(
  target_profile uuid,
  moderation_action text,
  reason text default null,
  duration_days integer default null
)
returns table(
  verified boolean,
  banned boolean,
  banned_until timestamptz,
  account_type public."AccountType"
)
language plpgsql security definer set search_path = ''
as $$
declare
  actor_role public."AccountRole";
  clean_reason text := nullif(trim(reason), '');
  ban_until timestamptz;
  action_id uuid;
begin
  perform private.assert_moderation_target(target_profile);
  actor_role := private.moderation_actor_role();

  if moderation_action in ('WARN', 'BAN', 'UNBAN', 'DEMOTE_ORGANIZATION')
    and clean_reason is null
  then
    raise exception 'moderation reason required' using errcode = '22023';
  end if;
  if char_length(coalesce(clean_reason, '')) > 1000 then
    raise exception 'moderation reason too long' using errcode = '22023';
  end if;

  if moderation_action = 'WARN' then
    insert into public.profile_infractions(
      profile_id, reason, details, expires_at
    ) values (target_profile, 'Aviso', left(clean_reason, 1000), null);

    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason
    ) values (auth.uid(), target_profile, 'USER_WARNED', clean_reason)
    returning id into action_id;

    insert into public.notifications(
      recipient_id, actor_id, kind, target_id, target_title
    ) values (
      target_profile, auth.uid(), 'moderation_warning', action_id, clean_reason
    );
  elsif moderation_action = 'BAN' then
    if duration_days is null and actor_role <> 'ADMIN' then
      raise exception 'permanent bans require admin' using errcode = '42501';
    end if;
    if duration_days is not null and (
      duration_days < 1
      or duration_days > case when actor_role = 'ADMIN' then 365 else 30 end
    ) then
      raise exception 'invalid ban duration' using errcode = '22023';
    end if;
    ban_until := case
      when duration_days is null then null
      else now() + make_interval(days => duration_days)
    end;

    insert into public.profile_moderation_state(
      profile_id, banned_at, banned_until, reason, moderated_by, updated_at
    ) values (
      target_profile, now(), ban_until, clean_reason, auth.uid(), now()
    )
    on conflict (profile_id) do update set
      banned_at = excluded.banned_at,
      banned_until = excluded.banned_until,
      reason = excluded.reason,
      moderated_by = excluded.moderated_by,
      updated_at = excluded.updated_at;

    delete from public.follows
    where follower_id = target_profile or following_id = target_profile;

    insert into public.profile_infractions(
      profile_id, reason, details, expires_at
    ) values (
      target_profile,
      case when ban_until is null then 'Banimento permanente' else 'Suspensão' end,
      clean_reason,
      ban_until
    );

    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason, metadata
    ) values (
      auth.uid(),
      target_profile,
      'USER_BANNED',
      clean_reason,
      jsonb_build_object('duration_days', duration_days, 'banned_until', ban_until)
    )
    returning id into action_id;

    insert into public.notifications(
      recipient_id, actor_id, kind, target_id, target_title
    ) values (
      target_profile, auth.uid(), 'moderation_suspended', action_id, clean_reason
    );
  elsif moderation_action = 'UNBAN' then
    delete from public.profile_moderation_state
    where profile_id = target_profile;
    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason
    ) values (
      auth.uid(), target_profile, 'USER_UNBANNED', clean_reason
    )
    returning id into action_id;

    insert into public.notifications(
      recipient_id, actor_id, kind, target_id, target_title
    ) values (
      target_profile, auth.uid(), 'moderation_reinstated', action_id, clean_reason
    );
  elsif moderation_action = 'VERIFY' then
    update public.profiles
    set
      verified = true,
      verified_at = now(),
      verified_by = auth.uid(),
      updated_at = now()
    where id = target_profile;
    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason
    ) values (
      auth.uid(), target_profile, 'USER_VERIFIED', clean_reason
    );
  elsif moderation_action = 'UNVERIFY' then
    update public.profiles
    set
      verified = false,
      verified_at = null,
      verified_by = null,
      updated_at = now()
    where id = target_profile;
    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason
    ) values (
      auth.uid(), target_profile, 'USER_UNVERIFIED', clean_reason
    );
  elsif moderation_action = 'DEMOTE_ORGANIZATION' then
    update public.profiles
    set
      account_type = 'PERSON',
      organization_tagline = null,
      updated_at = now()
    where id = target_profile;
    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason
    ) values (
      auth.uid(), target_profile, 'USER_ORG_REVOKED', clean_reason
    );
  else
    raise exception 'invalid moderation action' using errcode = '22023';
  end if;

  return query
  select
    profile.verified,
    state.profile_id is not null
      and (state.banned_until is null or state.banned_until > now()),
    state.banned_until,
    profile.account_type
  from public.profiles profile
  left join public.profile_moderation_state state
    on state.profile_id = profile.id
  where profile.id = target_profile;
end;
$$;

revoke all on function public.moderate_profile(uuid,text,text,integer)
  from public, anon;
grant execute on function public.moderate_profile(uuid,text,text,integer)
  to authenticated;

-- What an account has written lately, so it can be taken down without waiting
-- for somebody to report it.
--
-- Until now the only door to a comment or a screenshot was a report about
-- that exact row: an account caught posting the same thing forty times could
-- be banned, but the forty stayed up unless forty people flagged them. This
-- answers with the account's own recent content, already saying which pieces
-- are gone, and the removal functions it feeds take a null report.
--
-- It answers with nothing at all for anyone who is not staff rather than
-- raising, which is how the console's account search behaves: nothing the
-- caller may not have, and no confirmation that there was something to have.
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
      'PROFILE_COMMENT'::text as kind,
      comment.id,
      comment.body::text as body,
      coalesce('@' || wall.username, '')::text as context,
      comment.created_at::timestamptz as created_at,
      comment.deleted_at is not null as removed
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
