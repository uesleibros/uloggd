-- `role` stops being readable by ordinary signed-in accounts.
--
-- The previous migration closed it to anonymous callers but left it granted to
-- `authenticated`, because the moderation console lists other accounts' roles
-- and nothing else could serve that. So any logged-in user could still page
-- through `profiles` and learn exactly who moderates the platform, which is
-- the list you would want before trying to socially engineer one of them.
--
-- The two console queries move behind definer functions that check the caller
-- with `private.is_moderator()` first. With those in place the column grant is
-- unnecessary, and the answer to "who are the moderators" stops being a query
-- anyone can run.

/**
 * Accounts matching a moderation console search.
 *
 * Mirrors the console's own query: at least two characters, newest first,
 * capped. The cap and the minimum live here rather than in the caller so a
 * different caller cannot widen them.
 */
create or replace function public.moderation_search_accounts(term text)
returns table (
  id uuid, username text, display_name text, avatar_url text,
  role public."AccountRole", verified boolean,
  account_type public."AccountType", created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username::text, p.display_name::text, p.avatar_url::text,
    p.role, p.verified, p.account_type, p.created_at
  from public.profiles p
  where (select private.is_moderator())
    and length(btrim(coalesce(term, ''))) >= 2
    -- `like` metacharacters in the term are escaped rather than stripped, so a
    -- search for a name containing an underscore matches that name instead of
    -- silently matching everything.
    and (
      p.username ilike '%' || replace(replace(replace(btrim(term), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or p.display_name ilike '%' || replace(replace(replace(btrim(term), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by p.created_at desc
  limit 20
$$;

revoke all on function public.moderation_search_accounts(text) from public, anon;
grant execute on function public.moderation_search_accounts(text) to authenticated;

/**
 * The profiles behind a page of reports, for the console's report list.
 *
 * Takes the ids the console already resolved from the reports themselves, so
 * it cannot be used to enumerate: a caller who is not a moderator gets nothing
 * back regardless of what they pass.
 */
create or replace function public.moderation_profiles(ids uuid[])
returns table (
  id uuid, username text, display_name text, avatar_url text,
  role public."AccountRole", verified boolean,
  account_type public."AccountType", created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username::text, p.display_name::text, p.avatar_url::text,
    p.role, p.verified, p.account_type, p.created_at
  from public.profiles p
  where (select private.is_moderator())
    and p.id = any(coalesce(ids, '{}'::uuid[]))
$$;

revoke all on function public.moderation_profiles(uuid[]) from public, anon;
grant execute on function public.moderation_profiles(uuid[]) to authenticated;

-- With both console reads served, the column grant goes. `own_account_role()`
-- from the previous migration already covers a viewer reading themselves.
revoke select (role) on public.profiles from authenticated;
