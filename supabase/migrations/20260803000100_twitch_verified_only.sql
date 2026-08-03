-- A Twitch link now has to be proved, not typed.
--
-- The first version took a handle from a text field. Nothing stopped anyone
-- putting somebody else's channel there, and the profile would then show that
-- person's live stream under a stranger's name: the site would be making a
-- claim about who someone is with nothing behind it.
--
-- So the handle can only arrive one of two ways, and both are Twitch saying
-- it rather than the account saying it:
--
--   1. `connect_twitch`, reachable only by the server after it has exchanged
--      an authorization code for a token and asked Twitch who the token
--      belongs to. The browser cannot call it.
--   2. `adopt_twitch_identity`, which reads the identity Twitch issued at
--      sign-in. Already verified for the same reason.
--
-- Unlinking stays the account's own decision and needs no proof.

drop function if exists public.set_twitch_connection(text, text);

-- One channel belongs to one account. Without this, the same person could
-- approve the connection from two profiles and both would carry the badge and
-- the live card, which is the same false claim the OAuth step exists to stop,
-- just made twice.
create unique index if not exists profiles_twitch_user_id_key
  on public.profiles (twitch_user_id)
  where twitch_user_id is not null;

/**
 * Writes a Twitch link the server has already verified.
 *
 * Takes the profile id because the caller is the service role and has no
 * `auth.uid()`. That makes it a function that can write to any row, which is
 * exactly why it is revoked from every role a browser can reach: the OAuth
 * route is the only thing that may say whose channel this is.
 */
create or replace function public.connect_twitch(
  target uuid,
  handle text,
  channel_id text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare cleaned text;
begin
  cleaned := nullif(trim(both '@' from btrim(coalesce(handle, ''))), '');
  if cleaned is null or cleaned !~ '^[A-Za-z0-9_]{4,25}$' then
    raise exception 'invalid twitch username' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(channel_id, '')), '') is null then
    raise exception 'twitch channel id is required' using errcode = '22023';
  end if;

  update public.profiles
     set twitch_username = cleaned,
         twitch_user_id = btrim(channel_id)
   where id = target;
exception
  -- Its own code, so the route can say "that channel is on another account"
  -- instead of "something went wrong". Somebody hitting this has usually
  -- forgotten which uloggd account they linked it to, and a generic failure
  -- gives them nothing to act on.
  when unique_violation then
    raise exception 'twitch channel already linked' using errcode = '23505';
end;
$$;

revoke all on function public.connect_twitch(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.connect_twitch(uuid, text, text) to service_role;

/**
 * Drops the caller's own Twitch link.
 *
 * Needs no proof of anything: removing a claim about yourself is always
 * allowed, and making somebody re-authorize with Twitch just to unlink would
 * be a door that only opens inward.
 */
create or replace function public.disconnect_twitch()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.profiles
     set twitch_username = null,
         twitch_user_id = null
   where id = auth.uid();
end;
$$;

revoke all on function public.disconnect_twitch() from public, anon;
grant execute on function public.disconnect_twitch() to authenticated;

/**
 * Redefined only to survive the new unique index.
 *
 * The body is unchanged. What is new is that a channel can already be on
 * another profile, and this runs on every Twitch sign-in: an unhandled
 * conflict here would turn a successful login into an error page over a
 * cosmetic detail. It reports that it adopted nothing and lets the person in.
 */
create or replace function public.adopt_twitch_identity()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  identity record;
  handle text;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.profiles
     where id = caller and twitch_username is not null
  ) then
    return false;
  end if;

  select i.provider_id, i.identity_data into identity
    from auth.identities i
   where i.user_id = caller and i.provider = 'twitch'
   limit 1;
  if identity is null then return false; end if;

  -- Twitch sends the channel name under different keys depending on the flow.
  handle := coalesce(
    identity.identity_data ->> 'nickname',
    identity.identity_data ->> 'preferred_username',
    identity.identity_data ->> 'name',
    identity.identity_data ->> 'user_name'
  );
  if handle is null or btrim(handle) = '' then return false; end if;

  update public.profiles
     set twitch_username = btrim(handle),
         twitch_user_id = identity.provider_id
   where id = caller;
  return true;
exception
  when unique_violation then
    return false;
end;
$$;

revoke all on function public.adopt_twitch_identity() from public, anon;
grant execute on function public.adopt_twitch_identity() to authenticated;
