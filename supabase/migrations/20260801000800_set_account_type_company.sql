-- `set_account_type` learns about the company link, so the settings form can
-- write it the same way it writes the tagline and the website.
--
-- Validated here as well as by the constraint: a constraint violation reaches
-- the client as an opaque database error, while a raise here is something the
-- form can show next to the field that caused it.

drop function if exists public.set_account_type(text, text, text, text);

create function public.set_account_type(
  next_type text,
  next_tagline text default null,
  next_category text default null,
  next_url text default null,
  next_company text default null
)
returns public."AccountType"
language plpgsql security definer set search_path = ''
as $$
declare
  resolved public."AccountType";
  resolved_category public."OrganizationCategory";
  cleaned_url text;
  cleaned_company text;
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
      if cleaned_url !~ '^https?://' then
        cleaned_url := 'https://' || cleaned_url;
      end if;
      cleaned_url := regexp_replace(cleaned_url, '^http://', 'https://');
      if cleaned_url !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(/[^\s]*)?$'
         or char_length(cleaned_url) > 200 then
        raise exception 'invalid organization url' using errcode = '22023';
      end if;
    end if;

    -- Accepts a full company URL as well as a bare slug, since copying the
    -- address of the page is what someone will actually do.
    cleaned_company := nullif(trim(lower(coalesce(next_company, ''))), '');
    if cleaned_company is not null then
      cleaned_company := regexp_replace(cleaned_company, '^.*/(company|publisher)/', '');
      cleaned_company := split_part(cleaned_company, '?', 1);
      cleaned_company := rtrim(cleaned_company, '/');
      if cleaned_company !~ '^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$' then
        raise exception 'invalid company slug' using errcode = '22023';
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
      when resolved = 'ORGANIZATION' then resolved_category else null end,
    organization_url = case
      when resolved = 'ORGANIZATION' then cleaned_url else null end,
    organization_company_slug = case
      when resolved = 'ORGANIZATION' then cleaned_company else null end,
    updated_at = now()
  where id = auth.uid();
  return resolved;
end;
$$;

revoke all on function public.set_account_type(text,text,text,text,text) from public, anon;
grant execute on function public.set_account_type(text,text,text,text,text) to authenticated;

-- The trigger that clears organization fields on demotion needs the new column
-- too, or a demoted account keeps claiming a company.
create or replace function private.clear_organization_fields()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.account_type <> 'ORGANIZATION' then
    new.organization_tagline := null;
    new.organization_category := null;
    new.organization_url := null;
    new.organization_company_slug := null;
  end if;
  return new;
end;
$$;
