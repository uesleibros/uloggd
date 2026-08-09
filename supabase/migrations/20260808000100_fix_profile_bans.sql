-- `moderate_profile` was recreated when organization claims became
-- revocable, but that version wrote column names from a different schema
-- (`banned_by` and `ban_reason`). The moderation table has always called
-- those columns `moderated_by` and `reason`, so every BAN reached the
-- function and then failed with undefined_column.
--
-- Restore the original sanction behaviour while retaining the later
-- DEMOTE_ORGANIZATION action and account_type return value.
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
begin
  perform private.assert_moderation_target(target_profile);
  actor_role := private.moderation_actor_role();

  if moderation_action in ('BAN', 'UNBAN', 'DEMOTE_ORGANIZATION')
    and clean_reason is null
  then
    raise exception 'moderation reason required' using errcode = '22023';
  end if;
  if char_length(coalesce(clean_reason, '')) > 1000 then
    raise exception 'moderation reason too long' using errcode = '22023';
  end if;

  if moderation_action = 'BAN' then
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
    );
  elsif moderation_action = 'UNBAN' then
    delete from public.profile_moderation_state
    where profile_id = target_profile;
    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason
    ) values (
      auth.uid(), target_profile, 'USER_UNBANNED', clean_reason
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
