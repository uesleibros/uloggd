-- Abort before adding the case-insensitive index if legacy rows conflict.
do $$
begin
  if exists (select 1 from public.profiles where username is not null group by lower(username) having count(*) > 1) then
    raise exception 'case-insensitive username conflicts must be resolved before migration';
  end if;
end $$;

update public.profiles set username = lower(username) where username is not null and username <> lower(username);

alter table public.profiles drop constraint if exists profiles_username_key;
create unique index profiles_username_lower_unique on public.profiles (lower(username)) where username is not null;
alter table public.profiles add constraint profiles_username_format_check check (
  username is null or (
    username = lower(username)
    and char_length(username) between 3 and 32
    and username ~ '^[a-z0-9](?!.*__)[a-z0-9_]*[a-z0-9]$'
  )
);

create or replace function public.claim_username(candidate text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(trim(candidate));
  reserved constant text[] := array['admin','administrator','api','auth','callback','help','legal','login','logout','moderator','onboarding','privacy','profile','reset-password','settings','support','terms','uloggd','www'];
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(normalized) not between 3 and 32 or normalized !~ '^[a-z0-9](?!.*__)[a-z0-9_]*[a-z0-9]$' then raise exception 'invalid username' using errcode = '22023'; end if;
  if normalized = any(reserved) then raise exception 'reserved username' using errcode = '22023'; end if;
  update public.profiles set username = normalized, updated_at = now() where id = auth.uid() and username is null;
  if not found then raise exception 'profile missing or username already claimed' using errcode = 'P0002'; end if;
  return normalized;
end;
$$;
revoke all on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;
