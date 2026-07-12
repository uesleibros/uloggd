-- Remove a legacy overload that can make PostgREST choose a jsonb argument.
drop function if exists public.claim_username(jsonb);
drop function if exists public.claim_username(text);

alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles add constraint profiles_username_format_check check (
  username is null or (
    username = lower(username)
    and char_length(username) between 3 and 32
    and username ~ '^[a-z0-9][a-z0-9_]*[a-z0-9]$'
    and position('__' in username) = 0
  )
);

create function public.claim_username(candidate text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(trim(candidate));
  reserved constant text[] := array[
    'admin','administrator','api','auth','callback','help','legal','login',
    'logout','moderator','onboarding','privacy','profile','reset-password',
    'settings','support','terms','uloggd','www'
  ];
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
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

  update public.profiles
  set username = normalized, updated_at = now()
  where id = auth.uid() and username is null;

  if not found then
    raise exception 'profile missing or username already claimed' using errcode = 'P0002';
  end if;
  return jsonb_build_object('username', normalized);
end;
$$;

revoke all on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;
