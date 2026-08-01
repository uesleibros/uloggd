-- An organization account can say which catalogue company it is.
--
-- The catalogue already has a page per company, built from IGDB, and until now
-- there was no way to connect "the studio that made this" to "the account that
-- posts here as that studio". Someone landing on either had to guess.
--
-- Claiming is open, like the organization type itself: anyone may state it.
-- What is *shown* on the company page is gated on the verified badge, which is
-- already a moderation decision made by a person. That reuses the one check
-- this project already has for "we confirmed who this is", rather than
-- inventing a second approval queue that would need its own policy, its own
-- console and its own way of going stale.
--
-- The consequence is deliberate: an unverified claim appears on the account's
-- own profile, where it reads as a claim, and nowhere else. A squatter can say
-- they are Nintendo; they cannot make the Nintendo page say it.

alter table public.profiles
  add column if not exists organization_company_slug text;

alter table public.profiles
  drop constraint if exists profiles_organization_company_check;
alter table public.profiles
  add constraint profiles_organization_company_check check (
    organization_company_slug is null
    or (
      account_type = 'ORGANIZATION'
      -- The slug shape IGDB uses, and what the route already accepts.
      and organization_company_slug ~ '^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$'
    )
  );

-- Looked up by slug on every company page, for at most a handful of rows.
create index if not exists profiles_organization_company_idx
  on public.profiles (organization_company_slug)
  where organization_company_slug is not null;

grant select (organization_company_slug) on public.profiles to anon, authenticated;

/**
 * The account that represents a catalogue company, if one is confirmed.
 *
 * Only ever returns a verified account. The claim itself is self-declared, so
 * showing an unverified one here would let anyone put their name on any
 * company's page, which is exactly the impersonation the verified badge exists
 * to answer.
 *
 * Returns at most one row. Two accounts claiming the same company is possible
 * and harmless while unverified; if two are ever verified, the older claim
 * wins rather than the page picking arbitrarily.
 */
create or replace function public.company_official_account(company_slug text)
returns table (
  username text,
  display_name text,
  avatar_url text,
  organization_tagline text,
  organization_category public."OrganizationCategory"
)
language sql stable security invoker set search_path = '' as $$
  select p.username::text, p.display_name::text, p.avatar_url::text,
         p.organization_tagline::text, p.organization_category
    from public.profiles p
   where p.organization_company_slug = company_slug
     and p.account_type = 'ORGANIZATION'
     and p.verified
   order by p.verified_at nulls last, p.created_at
   limit 1
$$;

revoke all on function public.company_official_account(text) from public;
grant execute on function public.company_official_account(text) to anon, authenticated;
