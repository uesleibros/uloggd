-- See where the account is signed in, and sign somewhere out.
--
-- Every session the account has is a place a stolen password keeps working,
-- and until now the only view of them was nothing and the only remedy was
-- changing the password. This reads `auth.sessions` for the caller and lets
-- them revoke one, which is the standard shape every account-bearing site
-- ends up with.
--
-- Definer functions because `auth` is not exposed through the API at all.
-- Only the caller's own rows are reachable, and only the columns a person can
-- act on: the device string and the IP. The token material in that table
-- (`refresh_token_hmac_key` and friends) is exactly what must never transit.

/** The caller's sessions, newest activity first. */
create or replace function public.list_own_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip text
)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.created_at, coalesce(s.refreshed_at, s.updated_at), s.user_agent, s.ip::text
    from auth.sessions s
   where s.user_id = auth.uid()
   order by coalesce(s.refreshed_at, s.updated_at) desc
$$;

revoke all on function public.list_own_sessions() from public, anon;
grant execute on function public.list_own_sessions() to authenticated;

/**
 * Revokes one of the caller's sessions.
 *
 * Deleting the row is how GoTrue revokes: the refresh token dies with it and
 * the access token expires on its own within the hour. Raises on a session
 * that is not the caller's rather than deleting nothing silently, so the
 * interface cannot claim a sign-out that did not happen.
 */
create or replace function public.revoke_own_session(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  delete from auth.sessions
   where id = target and user_id = auth.uid();
  if not found then
    raise exception 'session not found' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.revoke_own_session(uuid) from public, anon;
grant execute on function public.revoke_own_session(uuid) to authenticated;
