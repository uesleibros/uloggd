-- Controlled username changes with cooldown, audit history, and temporary
-- redirects for links that still point at the previous handle.

alter table public.profiles
  add column if not exists username_changed_at timestamptz(6);

revoke update (username) on public.profiles from authenticated;

create table public.username_change_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  old_username varchar(32) not null,
  new_username varchar(32) not null,
  changed_at timestamptz(6) not null default now(),
  constraint username_history_different_check
    check (old_username <> new_username)
);

create index username_history_profile_changed_idx
  on public.username_change_history(profile_id, changed_at desc);
create index username_history_old_changed_idx
  on public.username_change_history(lower(old_username), changed_at desc);

alter table public.username_change_history enable row level security;
grant select on public.username_change_history to authenticated;
grant all privileges on public.username_change_history to service_role;

create policy "username_history_owner_read"
  on public.username_change_history for select to authenticated
  using (profile_id = auth.uid());

create function public.change_username(candidate text)
returns table(
  username text,
  changed_at timestamptz,
  next_change_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare
  normalized text := lower(trim(candidate));
  current_profile public.profiles;
  changed_time timestamptz := now();
  reserved constant text[] := array[
    'admin','administrator','api','auth','callback','help','legal','login',
    'logout','moderator','onboarding','privacy','profile','reset-password',
    'settings','support','terms','uloggd','www'
  ];
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if current_profile.id is null or current_profile.username is null then
    raise exception 'profile missing' using errcode = 'P0002';
  end if;
  if normalized is null
    or char_length(normalized) not between 3 and 32
    or normalized !~ '^[a-z0-9][a-z0-9_]*[a-z0-9]$'
    or position('__' in normalized) > 0 then
    raise exception 'invalid username' using errcode = '22023';
  end if;
  if normalized = any(reserved) then
    raise exception 'reserved username' using errcode = '22023';
  end if;
  if normalized = current_profile.username then
    raise exception 'username unchanged' using errcode = '22023';
  end if;
  if current_profile.username_changed_at is not null
    and current_profile.username_changed_at > changed_time - interval '30 days'
  then
    raise exception 'username cooldown'
      using errcode = 'P0001',
      detail = (
        current_profile.username_changed_at + interval '30 days'
      )::text;
  end if;
  if exists(
    select 1 from public.profiles
    where lower(username) = normalized and id <> auth.uid()
  ) or exists(
    select 1 from public.username_change_history
    where lower(old_username) = normalized
      and changed_at > changed_time - interval '30 days'
  ) then
    raise exception 'username unavailable' using errcode = '23505';
  end if;

  insert into public.username_change_history(
    profile_id, old_username, new_username, changed_at
  ) values (
    auth.uid(), current_profile.username, normalized, changed_time
  );

  update public.profiles
  set
    username = normalized,
    username_changed_at = changed_time,
    updated_at = changed_time
  where id = auth.uid();

  return query select
    normalized,
    changed_time,
    changed_time + interval '30 days';
end;
$$;

create function public.resolve_username_alias(candidate text)
returns text
language sql stable security definer set search_path = ''
as $$
  select profile.username
  from public.username_change_history history
  join public.profiles profile on profile.id = history.profile_id
  where lower(history.old_username) = lower(trim(candidate))
    and history.changed_at > now() - interval '30 days'
  order by history.changed_at desc
  limit 1
$$;

create function public.username_available(candidate text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    lower(trim(candidate)) ~ '^[a-z0-9][a-z0-9_]*[a-z0-9]$'
    and char_length(lower(trim(candidate))) between 3 and 32
    and position('__' in lower(trim(candidate))) = 0
    and lower(trim(candidate)) <> all(array[
      'admin','administrator','api','auth','callback','help','legal','login',
      'logout','moderator','onboarding','privacy','profile','reset-password',
      'settings','support','terms','uloggd','www'
    ])
    and not exists(
      select 1 from public.profiles
      where lower(username) = lower(trim(candidate))
    )
    and not exists(
      select 1 from public.username_change_history
      where lower(old_username) = lower(trim(candidate))
        and changed_at > now() - interval '30 days'
    )
$$;

revoke all on function public.change_username(text)
  from public, anon;
grant execute on function public.change_username(text)
  to authenticated;

revoke all on function public.resolve_username_alias(text)
  from public;
grant execute on function public.resolve_username_alias(text)
  to anon, authenticated;

revoke all on function public.username_available(text)
  from public;
grant execute on function public.username_available(text)
  to anon, authenticated;
