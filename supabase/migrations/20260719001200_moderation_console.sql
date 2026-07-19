-- Internal moderation queue, enforceable account sanctions, verification
-- controls, and an immutable audit trail.

drop function if exists public.review_verification_request(uuid,boolean,text);
drop table if exists public.verification_requests;
drop type if exists public."VerificationRequestStatus";

alter table public.reports
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists moderator_note varchar(1000),
  add column if not exists reviewed_at timestamptz(6);

create table public.profile_moderation_state (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  banned_at timestamptz(6) not null default now(),
  banned_until timestamptz(6),
  reason varchar(500) not null,
  moderated_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz(6) not null default now(),
  constraint moderation_state_reason_check
    check (char_length(trim(reason)) between 3 and 500),
  constraint moderation_state_future_check
    check (banned_until is null or banned_until > banned_at)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  target_profile_id uuid references public.profiles(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  action varchar(40) not null,
  reason varchar(1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz(6) not null default now(),
  constraint moderation_actions_type_check check (
    action in (
      'REPORT_REVIEWING',
      'REPORT_RESOLVED',
      'REPORT_DISMISSED',
      'USER_BANNED',
      'USER_UNBANNED',
      'USER_VERIFIED',
      'USER_UNVERIFIED'
    )
  )
);

create index moderation_actions_created_idx
  on public.moderation_actions(created_at desc);
create index moderation_actions_target_idx
  on public.moderation_actions(target_profile_id, created_at desc);
create index moderation_state_active_idx
  on public.profile_moderation_state(banned_until);

alter table public.profile_moderation_state enable row level security;
alter table public.moderation_actions enable row level security;

grant select on public.profile_moderation_state to authenticated;
grant select on public.moderation_actions to authenticated;
grant all privileges on public.profile_moderation_state, public.moderation_actions
  to service_role;

create policy "moderation_state_owner_or_staff_read"
  on public.profile_moderation_state for select to authenticated
  using (
    profile_id = auth.uid()
    or (select private.is_moderator())
  );

create policy "moderation_actions_staff_read"
  on public.moderation_actions for select to authenticated
  using ((select private.is_moderator()));

create policy "reports_staff_read"
  on public.reports for select to authenticated
  using ((select private.is_moderator()));

create policy "profile_infractions_staff_read"
  on public.profile_infractions for select to authenticated
  using ((select private.is_moderator()));

create function private.moderation_actor_role()
returns public."AccountRole"
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create function private.assert_moderation_target(target_profile uuid)
returns public."AccountRole"
language plpgsql stable security definer set search_path = ''
as $$
declare
  actor_role public."AccountRole";
  target_role public."AccountRole";
begin
  actor_role := private.moderation_actor_role();
  if actor_role not in ('MODERATOR', 'ADMIN') then
    raise exception 'moderator access required' using errcode = '42501';
  end if;
  if target_profile = auth.uid() then
    raise exception 'cannot moderate yourself' using errcode = '22023';
  end if;

  select role into target_role
  from public.profiles where id = target_profile;
  if target_role is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if actor_role = 'MODERATOR' and target_role <> 'USER' then
    raise exception 'insufficient role hierarchy' using errcode = '42501';
  end if;
  if actor_role = 'ADMIN' and target_role = 'ADMIN' then
    raise exception 'cannot moderate another admin' using errcode = '42501';
  end if;
  return target_role;
end;
$$;

create function public.moderate_report(
  target_report uuid,
  next_status text,
  note text default null
)
returns public.reports
language plpgsql security definer set search_path = ''
as $$
declare
  result public.reports;
  action_name text;
begin
  if not (select private.is_moderator()) then
    raise exception 'moderator access required' using errcode = '42501';
  end if;
  if next_status not in ('REVIEWING', 'RESOLVED', 'DISMISSED') then
    raise exception 'invalid report status' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(note, ''))) > 1000 then
    raise exception 'moderator note too long' using errcode = '22023';
  end if;

  update public.reports
  set
    status = next_status::public."ReportStatus",
    reviewed_by = auth.uid(),
    moderator_note = nullif(trim(note), ''),
    reviewed_at = case
      when next_status in ('RESOLVED', 'DISMISSED') then now()
      else null
    end,
    updated_at = now()
  where id = target_report
  returning * into result;

  if result.id is null then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  action_name := case next_status
    when 'REVIEWING' then 'REPORT_REVIEWING'
    when 'RESOLVED' then 'REPORT_RESOLVED'
    else 'REPORT_DISMISSED'
  end;
  insert into public.moderation_actions(
    moderator_id, target_profile_id, report_id, action, reason
  ) values (
    auth.uid(), result.target_profile_id, result.id, action_name, nullif(trim(note), '')
  );
  return result;
end;
$$;

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
begin
  perform private.assert_moderation_target(target_profile);
  actor_role := private.moderation_actor_role();

  if moderation_action in ('BAN', 'UNBAN') and clean_reason is null then
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

create or replace function private.require_mfa_for_mutation()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and exists (
    select 1
    from public.profile_moderation_state state
    where state.profile_id = auth.uid()
      and (state.banned_until is null or state.banned_until > now())
  ) then
    raise exception 'account suspended'
      using errcode = '42501', hint = 'This account cannot perform mutations.';
  end if;

  if auth.uid() is not null
    and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
    and exists (
      select 1 from auth.mfa_factors
      where user_id = auth.uid() and status = 'verified'
    )
  then
    raise exception 'second factor required'
      using errcode = '42501', hint = 'Complete MFA verification before changing account data.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists require_mfa_for_mutation on public.content_likes;
create trigger require_mfa_for_mutation
before insert or update or delete on public.content_likes
for each row execute function private.require_mfa_for_mutation();

revoke all on function private.moderation_actor_role()
  from public, anon, authenticated;
revoke all on function private.assert_moderation_target(uuid)
  from public, anon, authenticated;
revoke all on function public.moderate_report(uuid,text,text)
  from public, anon;
revoke all on function public.moderate_profile(uuid,text,text,integer)
  from public, anon;
grant execute on function public.moderate_report(uuid,text,text)
  to authenticated;
grant execute on function public.moderate_profile(uuid,text,text,integer)
  to authenticated;
