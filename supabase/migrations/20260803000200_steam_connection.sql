-- Steam on a profile, and what you are playing right now.
--
-- Same shape as Twitch, and for the same reason: the account has to be proved,
-- not typed. Steam signs in through OpenID 2.0 rather than OAuth 2, which is
-- older and stranger but ends in the same place, with Steam telling the server
-- a numeric id that belongs to one person.
--
-- The id is the only durable handle. A Steam display name changes as often as
-- somebody feels like it, so the name is stored for showing and the 64-bit id
-- is stored for identifying.

alter table public.profiles
  add column if not exists steam_id text,
  add column if not exists steam_username varchar(64),
  add column if not exists steam_playing_visible boolean not null default true;

-- One account per Steam profile, for the same reason as Twitch: two profiles
-- carrying the same connection would be the same false claim, made twice.
create unique index if not exists profiles_steam_id_key
  on public.profiles (steam_id)
  where steam_id is not null;

grant select (steam_id, steam_username, steam_playing_visible)
  on public.profiles to anon, authenticated;

comment on column public.profiles.steam_playing_visible is
  'Show what this account is playing on Steam right now. Separate from the connection: linking an account is not the same as agreeing to be watched while you play.';

/**
 * Writes a Steam link the server has already verified.
 *
 * Service role only, like its Twitch counterpart. The browser must never be
 * able to name a Steam account, because the profile then shows that account's
 * games and current session under this person's name.
 */
create or replace function public.connect_steam(
  target uuid,
  steam_id text,
  persona text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare cleaned_id text;
begin
  cleaned_id := nullif(btrim(coalesce(steam_id, '')), '');
  -- A SteamID64 is 17 digits and always will be: the format is a fixed-width
  -- packing of universe, type and account number, not a counter that grows.
  if cleaned_id is null or cleaned_id !~ '^[0-9]{17}$' then
    raise exception 'invalid steam id' using errcode = '22023';
  end if;

  update public.profiles
     set steam_id = cleaned_id,
         -- Nullable on purpose. The display name comes from the Steam Web API,
         -- which needs a key the deployment may not have; without it the link
         -- still works and the profile simply shows the numeric id.
         steam_username = nullif(btrim(coalesce(persona, '')), '')
   where id = target;
exception
  when unique_violation then
    raise exception 'steam account already linked' using errcode = '23505';
end;
$$;

revoke all on function public.connect_steam(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.connect_steam(uuid, text, text) to service_role;

/** Drops the caller's own Steam link. */
create or replace function public.disconnect_steam()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.profiles
     set steam_id = null,
         steam_username = null
   where id = auth.uid();
end;
$$;

revoke all on function public.disconnect_steam() from public, anon;
grant execute on function public.disconnect_steam() to authenticated;

/**
 * Whether "playing right now" may appear on the caller's profile.
 *
 * Its own decision, separate from the link. What you are playing at this
 * moment says where you are and that you are at a keyboard, which is more
 * than a list of games you own says, and somebody can reasonably want the
 * second without the first.
 */
create or replace function public.set_steam_playing_visible(visible boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.profiles set steam_playing_visible = coalesce(visible, true)
   where id = auth.uid();
end;
$$;

revoke all on function public.set_steam_playing_visible(boolean)
  from public, anon;
grant execute on function public.set_steam_playing_visible(boolean)
  to authenticated;
