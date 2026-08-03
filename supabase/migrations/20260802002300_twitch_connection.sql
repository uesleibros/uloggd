-- Twitch on a profile, and the live card that comes with it.
--
-- Two separate things, and they are separate on purpose. The handle is a
-- social link like the others and is public with the profile. Whether a live
-- stream is surfaced is a decision about being watched, and gets its own
-- setting that defaults to on only for people who linked deliberately.
--
-- `twitch_user_id` exists because handles change. Twitch lets anyone rename,
-- and a renamed account would either go dead or, worse, point the card at
-- whoever took the old name; the numeric id is the thing that identifies a
-- channel for life.

alter table public.profiles
  add column if not exists twitch_username varchar(25),
  add column if not exists twitch_user_id text,
  add column if not exists twitch_live_visible boolean not null default true;

-- Readable with the rest of a profile. The live card has to render for
-- visitors, so the handle and the preference both travel with the row; the
-- numeric id is not secret either, it is on every Twitch page.
grant select (twitch_username, twitch_user_id, twitch_live_visible)
  on public.profiles to anon, authenticated;

comment on column public.profiles.twitch_live_visible is
  'Show the live card on the profile while this channel is streaming. Separate from the handle: linking an account is not the same as agreeing to be broadcast.';

/**
 * Sets or clears the caller's Twitch link.
 *
 * Takes the numeric id alongside the handle because only the caller's session
 * can know it: it comes from the identity Twitch itself issued at sign-in, or
 * from a lookup the server does with its own credentials. A handle typed by
 * hand arrives without one, which is fine and simply means the card resolves
 * by name until something refreshes it.
 */
create or replace function public.set_twitch_connection(
  handle text,
  user_id text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare cleaned text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  cleaned := nullif(trim(both '@' from btrim(coalesce(handle, ''))), '');
  -- Twitch logins are 4 to 25 characters of letters, digits and underscore.
  -- Rejected rather than stored and quietly broken, since a bad handle means a
  -- live card that never appears and nothing saying why.
  if cleaned is not null and cleaned !~ '^[A-Za-z0-9_]{4,25}$' then
    raise exception 'invalid twitch username' using errcode = '22023';
  end if;

  update public.profiles
     set twitch_username = cleaned,
         -- Kept only while the handle stays the same. An id belongs to one
         -- channel, so carrying it across an unlink or a switch to a different
         -- name would leave the profile pointing at the previous channel.
         twitch_user_id = coalesce(
           nullif(btrim(coalesce(user_id, '')), ''),
           case
             when cleaned is not null and lower(cleaned) = lower(twitch_username)
               then twitch_user_id
           end
         )
   where id = auth.uid();
end;
$$;

revoke all on function public.set_twitch_connection(text, text) from public, anon;
grant execute on function public.set_twitch_connection(text, text) to authenticated;

/** Whether the live card may appear on the caller's profile. */
create or replace function public.set_twitch_live_visible(visible boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.profiles set twitch_live_visible = coalesce(visible, true)
   where id = auth.uid();
end;
$$;

revoke all on function public.set_twitch_live_visible(boolean) from public, anon;
grant execute on function public.set_twitch_live_visible(boolean) to authenticated;

/**
 * Adopts the Twitch identity the caller signed in with, if there is one.
 *
 * Called after sign-in. Somebody who chose "continue with Twitch" has already
 * told us their channel, and asking them to type it again is asking for the
 * one piece of information they just handed over.
 *
 * Never overwrites a handle that is already set: the link is theirs to change,
 * and a sign-in should not undo an edit they made on purpose.
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
end;
$$;

revoke all on function public.adopt_twitch_identity() from public, anon;
grant execute on function public.adopt_twitch_identity() to authenticated;
