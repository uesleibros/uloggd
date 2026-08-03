-- Which ways this account can sign in.
--
-- The General tab never said. Somebody who signed up a year ago through
-- Discord and comes back to a password prompt has no way to find out they
-- never had a password, which is the moment accounts get abandoned or
-- duplicated.
--
-- Definer because `auth.identities` is not exposed through the API, and
-- deliberately narrow: the provider, when it was linked, and when it was last
-- used. `identity_data` holds whatever the provider sent about the person and
-- has no business leaving here.

create or replace function public.list_own_identities()
returns table (
  provider text,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select i.provider, i.email, i.created_at, i.last_sign_in_at
    from auth.identities i
   where i.user_id = auth.uid()
   order by i.last_sign_in_at desc nulls last, i.created_at
$$;

revoke all on function public.list_own_identities() from public, anon;
grant execute on function public.list_own_identities() to authenticated;
