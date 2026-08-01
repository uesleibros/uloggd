-- An organization account gains the two things it needs and a person does not:
-- what kind of organization it is, and where to find it off uloggd.
--
-- Until now the claim was a flag and a 60-character tagline. That says an
-- account is not a person, and nothing else. The two questions someone actually
-- has when they land on one are "what is this" and "is this really them", and
-- neither had an answer beyond prose the account writes about itself.
--
-- The category answers the first from a fixed list, so it cannot be gamed into
-- claiming something it is not, and so surfaces can style and filter on it. The
-- website answers the second better than any badge: a store's own domain
-- linking back is evidence a squatter cannot fabricate.
--
-- These are the categories the original migration named in prose without ever
-- storing.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'OrganizationCategory') then
    create type public."OrganizationCategory" as enum (
      'STORE', 'STUDIO', 'PUBLISHER', 'OUTLET', 'COMMUNITY', 'OTHER'
    );
  end if;
end
$$;

alter table public.profiles
  add column if not exists organization_category public."OrganizationCategory",
  add column if not exists organization_url text;

-- Both are meaningless on a person, and leaving a stale value behind would keep
-- an ex-organization looking like one in every surface that reads them.
alter table public.profiles
  drop constraint if exists profiles_organization_fields_check;
alter table public.profiles
  add constraint profiles_organization_fields_check check (
    (account_type = 'ORGANIZATION')
    or (organization_category is null and organization_url is null)
  );

-- https only, and no credentials in the URL. This is rendered as a link that
-- other people click, so `javascript:` and `data:` must never reach it, and
-- `user:password@host` is a phishing shape rather than a website.
alter table public.profiles
  drop constraint if exists profiles_organization_url_check;
alter table public.profiles
  add constraint profiles_organization_url_check check (
    organization_url is null
    or (
      organization_url ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(/[^\s]*)?$'
      and char_length(organization_url) between 12 and 200
    )
  );

grant select (organization_category, organization_url)
  on public.profiles to anon, authenticated;

drop function if exists public.set_account_type(text, text);

/**
 * Owner-only switch between a personal and an organization account.
 *
 * Switching back to a person clears every organization field, since the
 * constraints only allow them on organizations and a stale value would block
 * every later write to the row.
 *
 * The category and the website are validated here as well as by the
 * constraints: a constraint violation surfaces to the client as an opaque
 * database error, while these raise something the settings form can show.
 */
create function public.set_account_type(
  next_type text,
  next_tagline text default null,
  next_category text default null,
  next_url text default null
)
returns public."AccountType"
language plpgsql security definer set search_path = ''
as $$
declare
  resolved public."AccountType";
  resolved_category public."OrganizationCategory";
  cleaned_url text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if next_type not in ('PERSON', 'ORGANIZATION') then
    raise exception 'invalid account type' using errcode = '22023';
  end if;
  resolved := next_type::public."AccountType";

  if char_length(trim(coalesce(next_tagline, ''))) > 60 then
    raise exception 'tagline too long' using errcode = '22023';
  end if;

  if resolved = 'ORGANIZATION' then
    if nullif(trim(coalesce(next_category, '')), '') is not null then
      if next_category not in ('STORE','STUDIO','PUBLISHER','OUTLET','COMMUNITY','OTHER') then
        raise exception 'invalid organization category' using errcode = '22023';
      end if;
      resolved_category := next_category::public."OrganizationCategory";
    end if;

    cleaned_url := nullif(trim(coalesce(next_url, '')), '');
    if cleaned_url is not null then
      -- A bare domain is what people type, so it is accepted and completed
      -- rather than rejected on a technicality.
      if cleaned_url !~ '^https?://' then
        cleaned_url := 'https://' || cleaned_url;
      end if;
      cleaned_url := regexp_replace(cleaned_url, '^http://', 'https://');
      if cleaned_url !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(/[^\s]*)?$'
         or char_length(cleaned_url) > 200 then
        raise exception 'invalid organization url' using errcode = '22023';
      end if;
    end if;
  end if;

  update public.profiles set
    account_type = resolved,
    organization_tagline = case
      when resolved = 'ORGANIZATION' then nullif(trim(coalesce(next_tagline, '')), '')
      else null
    end,
    organization_category = case
      when resolved = 'ORGANIZATION' then resolved_category
      else null
    end,
    organization_url = case
      when resolved = 'ORGANIZATION' then cleaned_url
      else null
    end,
    updated_at = now()
  where id = auth.uid();
  return resolved;
end;
$$;

revoke all on function public.set_account_type(text,text,text,text) from public, anon;
grant execute on function public.set_account_type(text,text,text,text) to authenticated;

/**
 * Keeps the organization fields and the account type consistent, whoever
 * writes.
 *
 * `moderate_profile` demotes an account by setting the type to PERSON and
 * clearing the tagline; it knows nothing about the two columns added here, so
 * the constraint above would have rejected every revocation and broken
 * moderation outright. Patching that function would have fixed today's caller
 * and left the next one to rediscover this.
 *
 * A trigger makes the invariant hold by construction instead: the constraint
 * states the rule, and this makes every writer comply with it.
 */
create or replace function private.clear_organization_fields()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.account_type <> 'ORGANIZATION' then
    new.organization_tagline := null;
    new.organization_category := null;
    new.organization_url := null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_clear_organization_fields on public.profiles;
create trigger profiles_clear_organization_fields
  before insert or update on public.profiles
  for each row execute function private.clear_organization_fields();
