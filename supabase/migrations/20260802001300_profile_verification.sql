-- What the verified dialog shows, read by profile id.
--
-- The dialog took the grant date and the granting account as props, and only
-- the profile page had them to give. Everywhere else the badge rendered
-- without them and credited uloggd, so the same account's badge said two
-- different things depending on which page you clicked it from.
--
-- Read on open rather than fetched with every name on a page: a badge is
-- clicked rarely, and joining the verifier into every feed query to fill a
-- dialog nobody opened would be the wrong trade.
--
-- Definer because `verified_by` is not a column the API roles select. Only the
-- three fields the dialog draws leave here, and only for an account that is
-- actually verified, which is already public.

create or replace function public.profile_verification(target uuid)
returns table (
  verified_at timestamptz,
  verifier_username text,
  verifier_display_name text,
  verifier_avatar_url text
)
language sql stable security definer set search_path = ''
as $$
  select p.verified_at,
         v.username::text,
         v.display_name::text,
         v.avatar_url::text
    from public.profiles p
    left join public.profiles v on v.id = p.verified_by
   where p.id = target
     and p.verified
$$;

revoke all on function public.profile_verification(uuid) from public;
grant execute on function public.profile_verification(uuid) to anon, authenticated;
