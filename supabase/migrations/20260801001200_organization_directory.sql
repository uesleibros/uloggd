-- A directory of the organizations on uloggd.
--
-- Until now an organization account could only be found by already knowing its
-- name. The account type, the category and the verified flag were all stored
-- and none of them were browsable, so the one thing that makes these accounts
-- worth marking was invisible.
--
-- A function rather than a select, because the ordering is the product
-- decision here and belongs in one place: verified first, then the ones that
-- filled in what they are, then by name. A caller ordering it differently
-- would quietly change what the directory means.

create or replace function public.organization_directory(
  search text default null,
  category_filter text default null,
  page_limit integer default 40,
  page_offset integer default 0
)
returns table (
  username text,
  display_name text,
  avatar_url text,
  organization_tagline text,
  organization_category public."OrganizationCategory",
  organization_url text,
  organization_company_slug text,
  verified boolean,
  follower_count bigint,
  total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with matching as (
    -- Columns listed rather than `p.*`: this runs as the caller, and `profiles`
    -- has columns revoked from every public role, so a star select fails
    -- outright with a permission error rather than omitting them.
    select p.id, p.username, p.display_name, p.avatar_url,
           p.organization_tagline, p.organization_category, p.organization_url,
           p.organization_company_slug, p.verified
      from public.profiles p
     where p.account_type = 'ORGANIZATION'
       -- Private accounts are left out. Being listed in a directory is the
       -- opposite of what that setting asks for, and an organization that
       -- wants to be found simply does not set it.
       and coalesce(p.is_private, false) = false
       and (
         category_filter is null
         or p.organization_category = category_filter::public."OrganizationCategory"
       )
       and (
         search is null
         or btrim(search) = ''
         -- Escaped rather than stripped, so a name containing an underscore is
         -- searchable instead of matching everything.
         or p.username ilike '%' || replace(replace(replace(btrim(search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
         or p.display_name ilike '%' || replace(replace(replace(btrim(search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
       )
  )
  select m.username::text, m.display_name::text, m.avatar_url::text,
         m.organization_tagline::text, m.organization_category,
         m.organization_url::text, m.organization_company_slug::text,
         m.verified,
         (select count(*) from public.follows f where f.following_id = m.id),
         (select count(*) from matching)
    from matching m
   order by m.verified desc,
            -- An account that said what it is ranks above one that did not,
            -- since the category is what makes the directory navigable.
            (m.organization_category is null),
            coalesce(m.display_name, m.username)
   limit least(greatest(page_limit, 1), 60)
  offset greatest(page_offset, 0)
$$;

revoke all on function public.organization_directory(text, text, integer, integer) from public;
grant execute on function public.organization_directory(text, text, integer, integer)
  to anon, authenticated;
