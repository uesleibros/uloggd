-- Moderation can revoke an organization claim.
--
-- Registering an organization account is open, so the claim is self-declared
-- and unverified by design. Without a lever, an account claiming to be a brand
-- it does not represent could only be banned outright, too blunt for a
-- misapplied label, and useless for freeing the impersonated brand's name.
-- `DEMOTE_ORGANIZATION` returns the account to a person and clears the tagline,
-- leaving the account itself intact.

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
      'USER_ORG_REVOKED'
    )
  );

-- Recreated to carry the account type back to the console and to handle the
-- new action. Everything else is the behaviour already in place.
drop function if exists public.moderate_profile(uuid,text,text,integer);

create function public.moderate_profile(
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

  if moderation_action in ('BAN', 'UNBAN') and clean_reason is null then
    raise exception 'moderation reason required' using errcode = '22023';
  end if;
  -- Revoking a brand claim is a judgement about identity, so it is recorded
  -- with its justification like a ban is.
  if moderation_action = 'DEMOTE_ORGANIZATION' and clean_reason is null then
    raise exception 'moderation reason required' using errcode = '22023';
  end if;
  if char_length(coalesce(clean_reason, '')) > 1000 then
    raise exception 'moderation reason too long' using errcode = '22023';
  end if;

  if moderation_action = 'BAN' then
    if duration_days is not null and duration_days not between 1 and 3650 then
      raise exception 'invalid ban duration' using errcode = '22023';
    end if;
    ban_until := case
      when duration_days is null then null
      else now() + make_interval(days => duration_days)
    end;
    insert into public.profile_moderation_state(profile_id, banned_at, banned_until, banned_by, ban_reason)
    values (target_profile, now(), ban_until, auth.uid(), clean_reason)
    on conflict (profile_id) do update set
      banned_at = now(),
      banned_until = excluded.banned_until,
      banned_by = auth.uid(),
      ban_reason = excluded.ban_reason,
      updated_at = now();
    insert into public.moderation_actions(
      moderator_id, target_profile_id, action, reason, metadata
    ) values (
      auth.uid(), target_profile, 'USER_BANNED', clean_reason,
      jsonb_build_object('duration_days', duration_days)
    );
  elsif moderation_action = 'UNBAN' then
    delete from public.profile_moderation_state where profile_id = target_profile;
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

revoke all on function public.moderate_profile(uuid,text,text,integer) from public, anon;
grant execute on function public.moderate_profile(uuid,text,text,integer) to authenticated;
