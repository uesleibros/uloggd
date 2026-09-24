-- uloggd is accounts, not account types.
--
-- The organization account was a second kind of profile: a tagline, a
-- category, a website, a claimed company slug, a team of members, a mark
-- beside the name, a moderation action to revoke it, and a branch in every
-- read that returned a profile. One account ever used it. Everything that
-- shape touched is removed here rather than left switched off, because a
-- column nothing can set is a column every later reader still has to think
-- about.
--
-- The one organization account is deleted outright, which is what was asked
-- for. `profiles.id` references `auth.users`, so the account goes at the top
-- and everything it wrote follows it down the cascade.

delete from auth.users u
where exists (
  select 1 from public.profiles p
  where p.id = u.id and p.account_type = 'ORGANIZATION'
);

-- The trigger first: it reads the columns this migration is about to drop.
drop trigger if exists profiles_clear_organization_fields on public.profiles;
drop function if exists private.clear_organization_fields();

drop function if exists public.add_organization_member(text, text);
drop function if exists public.organization_members_of(uuid);
drop function if exists public.manages_organization(uuid);
drop function if exists public.organization_directory(text, integer);
drop function if exists public.company_official_account(text);
drop function if exists public.set_account_type(text, text, text, text, text);
drop function if exists public.set_account_type(text, text, text, text);
drop function if exists public.set_account_type(text, text);

-- Its policies go with it.
drop table if exists public.organization_members;

-- Recreated without the column. Each of these named `account_type` in its
-- return type, so the column cannot be dropped while they stand.
drop function if exists public.get_content_comments(text, uuid);
create function public.get_content_comments(target_type text, target_id uuid)
returns table (
  id uuid, public_id text, parent_id uuid, author_id uuid, body text,
  deleted_at timestamptz, created_at timestamptz, updated_at timestamptz,
  username text, display_name text, avatar_url text, verified boolean,
  like_count bigint, liked_by_viewer boolean
)
language sql stable security definer set search_path = ''
as $$
  select comment.id, comment.public_id, comment.parent_id, comment.author_id,
    comment.body::text, comment.deleted_at, comment.created_at, comment.updated_at,
    author.username::text, author.display_name::text, author.avatar_url::text,
    author.verified, count(likes.profile_id)::bigint,
    coalesce(bool_or(likes.profile_id = auth.uid()), false)
  from public.content_comments comment
  join public.profiles author on author.id = comment.author_id
  left join public.content_likes likes
    on likes.content_type = 'content_comment' and likes.content_id = comment.id
  where comment.content_type = target_type and comment.content_id = target_id
    and public.content_comments_visible(target_type, target_id)
  group by comment.id, author.username, author.display_name, author.avatar_url,
    author.verified
  order by comment.created_at
$$;
revoke all on function public.get_content_comments(text, uuid) from public;
grant execute on function public.get_content_comments(text, uuid)
  to anon, authenticated;

drop function if exists public.moderation_profiles(uuid[]);
create function public.moderation_profiles(ids uuid[])
returns table (
  id uuid, username text, display_name text, avatar_url text,
  role public."AccountRole", verified boolean, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.username::text, p.display_name::text, p.avatar_url::text,
    p.role, p.verified, p.created_at
  from public.profiles p
  where (select private.is_moderator())
    and p.id = any(coalesce(ids, '{}'::uuid[]))
$$;
revoke all on function public.moderation_profiles(uuid[]) from public, anon;
grant execute on function public.moderation_profiles(uuid[]) to authenticated;

drop function if exists public.moderation_search_accounts(text);
create function public.moderation_search_accounts(term text)
returns table (
  id uuid, username text, display_name text, avatar_url text,
  role public."AccountRole", verified boolean, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.username::text, p.display_name::text, p.avatar_url::text,
    p.role, p.verified, p.created_at
  from public.profiles p
  where (select private.is_moderator())
    and length(btrim(coalesce(term, ''))) >= 2
    -- `like` metacharacters in the term are escaped rather than stripped, so a
    -- search for a name containing an underscore matches that name instead of
    -- silently matching everything.
    and (
      p.username ilike '%' || replace(replace(replace(btrim(term), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or p.display_name ilike '%' || replace(replace(replace(btrim(term), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by p.created_at desc
  limit 20
$$;
revoke all on function public.moderation_search_accounts(text) from public, anon;
grant execute on function public.moderation_search_accounts(text) to authenticated;

-- The sanctions, without the one that revoked an organization. Old audit rows
-- keep saying USER_ORG_REVOKED, so the constraint still accepts the word: the
-- log is a record of what was done, and rewriting history to match today's
-- feature set would be the wrong kind of tidy.
drop function if exists public.moderate_profile(uuid, text, text, integer);
create function public.moderate_profile(
  target_profile uuid,
  moderation_action text,
  reason text default null,
  duration_days integer default null
)
returns table(
  verified boolean,
  banned boolean,
  banned_until timestamptz
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

  if moderation_action in ('WARN', 'BAN', 'UNBAN') and clean_reason is null then
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
  else
    raise exception 'invalid moderation action' using errcode = '22023';
  end if;

  return query
  select
    profile.verified,
    state.profile_id is not null
      and (state.banned_until is null or state.banned_until > now()),
    state.banned_until
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

-- The columns themselves, and the shapes that only existed for them. The
-- constraints and indexes on these columns go with the columns.
alter table public.profiles
  drop column if exists account_type,
  drop column if exists organization_tagline,
  drop column if exists organization_category,
  drop column if exists organization_url,
  drop column if exists organization_company_slug;

drop type if exists public."OrganizationRole";
drop type if exists public."OrganizationCategory";
drop type if exists public."AccountType";
