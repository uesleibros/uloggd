-- The official account card can show a level like every other name.
--
-- `company_official_account` returned everything needed to draw the card
-- except the profile id, which is what the level is read by. The card was the
-- last user-facing place a verified mark appeared without one beside it.

drop function if exists public.company_official_account(text);
create function public.company_official_account(company_slug text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  organization_tagline text,
  organization_category public."OrganizationCategory"
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username::text, p.display_name::text, p.avatar_url::text,
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
