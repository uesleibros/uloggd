-- Organization accounts: a profile that represents a store, studio, publisher,
-- community or outlet rather than a person. It signs in, is followed, and
-- posts like any other account.
--
-- This is a separate column from `role` on purpose. `role` is the permission
-- ladder, and moderation reads it as one: `moderate_account` refuses when
-- `actor_role = 'MODERATOR' and target_role <> 'USER'`. Folding ORGANIZATION
-- into that enum would have made every organization unmoderatable by
-- moderators — exactly the account type most exposed to brand impersonation,
-- since anyone may register one.

create type public."AccountType" as enum ('PERSON', 'ORGANIZATION');

alter table public.profiles
  add column if not exists account_type public."AccountType" not null default 'PERSON';

-- A short, factual label under the name: "Loja de jogos digitais",
-- "Estúdio independente". Free text, not a taxonomy, because the set of
-- organisations a games community attracts is not knowable up front.
alter table public.profiles
  add column if not exists organization_tagline varchar(60);

alter table public.profiles
  drop constraint if exists profiles_organization_tagline_check;
alter table public.profiles
  add constraint profiles_organization_tagline_check check (
    organization_tagline is null
    or (account_type = 'ORGANIZATION' and char_length(trim(organization_tagline)) between 1 and 60)
  );

create index if not exists profiles_organization_idx
  on public.profiles(account_type) where account_type = 'ORGANIZATION';

grant usage on type public."AccountType" to anon, authenticated, service_role;

/**
 * Owner-only switch between a personal and an organization account.
 *
 * Switching back to a person clears the tagline, since the constraint only
 * allows it on organizations and a stale value would block every later write
 * to the row.
 */
create function public.set_account_type(
  next_type text,
  next_tagline text default null
)
returns public."AccountType"
language plpgsql security definer set search_path = ''
as $$
declare resolved public."AccountType";
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if next_type not in ('PERSON', 'ORGANIZATION') then
    raise exception 'invalid account type' using errcode = '22023';
  end if;
  resolved := next_type::public."AccountType";
  if char_length(trim(coalesce(next_tagline, ''))) > 60 then
    raise exception 'tagline too long' using errcode = '22023';
  end if;

  update public.profiles set
    account_type = resolved,
    organization_tagline = case
      when resolved = 'ORGANIZATION' then nullif(trim(coalesce(next_tagline, '')), '')
      else null
    end,
    updated_at = now()
  where id = auth.uid();
  return resolved;
end;
$$;

revoke all on function public.set_account_type(text,text) from public, anon;
grant execute on function public.set_account_type(text,text) to authenticated;
