-- Keys for the public API.
--
-- A key resolves to its owner and the request runs as that account, so every
-- policy, column grant and definer function already in this database keeps
-- deciding what the request may do. Scopes narrow that; they never widen it.
--
-- The token is generated here and shown once. Only its hash is stored, and the
-- hash is not readable through the API at all: `token_hash` is left out of the
-- column grants, and the lookup lives in a definer function the service role
-- is the only caller of. A stolen publishable key cannot enumerate hashes.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name varchar(60) not null,
  prefix char(8) not null,
  token_hash text not null unique,
  scopes text[] not null default '{}',
  last_used_at timestamptz(6),
  expires_at timestamptz(6),
  revoked_at timestamptz(6),
  created_at timestamptz(6) not null default now(),
  -- The ceiling is stated once, here, so a scope that does not exist cannot be
  -- stored by any path, including a future one that forgets to check.
  constraint api_keys_scopes_known check (
    scopes <@ array[
      'profile.read', 'profile.write',
      'library.read', 'library.write',
      'reviews.read', 'reviews.write',
      'journal.read', 'journal.write',
      'lists.read', 'lists.write',
      'screenshots.read', 'screenshots.write',
      'social.read', 'social.write',
      'catalog.read'
    ]::text[]
  ),
  constraint api_keys_name_present check (char_length(trim(name)) between 1 and 60)
);

create index if not exists api_keys_profile_idx
  on public.api_keys (profile_id, created_at desc);

alter table public.api_keys enable row level security;

-- Reading is the only thing the owner does directly. Creating and revoking go
-- through the functions below, because the token has to be generated where the
-- caller cannot choose it and the hash has to be written where it cannot be
-- read back.
create policy api_keys_read on public.api_keys
  for select using ((select auth.uid()) = profile_id);

revoke all on public.api_keys from anon, authenticated;
grant select (
  id, profile_id, name, prefix, scopes,
  last_used_at, expires_at, revoked_at, created_at
) on public.api_keys to authenticated;

/**
 * Creates a key and returns its token once. The token is never recoverable
 * afterwards: what is stored is a sha256 of it.
 */
create or replace function public.create_api_key(
  key_name text,
  key_scopes text[] default '{}',
  key_expires timestamptz default null
)
returns table (id uuid, token text, prefix text, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  clean_name text := nullif(trim(key_name), '');
  secret text;
  raw_token text;
  held integer;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if clean_name is null or char_length(clean_name) > 60 then
    raise exception 'a key needs a name of 1 to 60 characters'
      using errcode = '22023';
  end if;
  if key_expires is not null and key_expires <= now() then
    raise exception 'expiry must be in the future' using errcode = '22023';
  end if;

  select count(*) into held
    from public.api_keys
   where profile_id = caller and revoked_at is null;
  if held >= 20 then
    raise exception 'too many active keys' using errcode = '22023';
  end if;

  -- 128 bits from the server's own generator. The caller never influences it,
  -- which is what keeps a guessed token out of reach.
  secret := replace(pg_catalog.gen_random_uuid()::text, '-', '');
  raw_token := 'ulg_live_' || secret;

  return query
  insert into public.api_keys (profile_id, name, prefix, token_hash, scopes, expires_at)
  values (
    caller,
    clean_name,
    substring(secret from 1 for 8),
    pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(raw_token, 'utf8')), 'hex'
    ),
    coalesce(key_scopes, '{}'),
    key_expires
  )
  returning
    public.api_keys.id,
    raw_token,
    public.api_keys.prefix::text,
    public.api_keys.created_at;
end;
$$;

revoke all on function public.create_api_key(text, text[], timestamptz)
  from public, anon;
grant execute on function public.create_api_key(text, text[], timestamptz)
  to authenticated;

/** Revokes one of the caller's keys. Idempotent. */
create or replace function public.revoke_api_key(key_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.api_keys
     set revoked_at = now()
   where id = key_id and profile_id = caller and revoked_at is null;
  return found;
end;
$$;

revoke all on function public.revoke_api_key(uuid) from public, anon;
grant execute on function public.revoke_api_key(uuid) to authenticated;

/**
 * Resolves a presented token to its owner, or nothing.
 *
 * Only the service role may call this: it is the one place a hash is compared,
 * and nobody holding a publishable key should be able to ask the question at
 * all. Returns no row for an unknown, revoked or expired key, so the caller
 * cannot tell the three apart from the outside.
 */
create or replace function public.resolve_api_key(raw_token text)
returns table (key_id uuid, profile_id uuid, scopes text[])
language plpgsql security definer set search_path = ''
as $$
declare
  presented text;
begin
  if raw_token is null or raw_token !~ '^ulg_live_[0-9a-f]{32}$' then
    return;
  end if;
  presented := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(raw_token, 'utf8')), 'hex'
  );

  return query
  update public.api_keys k
     set last_used_at = now()
   where k.token_hash = presented
     and k.revoked_at is null
     and (k.expires_at is null or k.expires_at > now())
  returning k.id, k.profile_id, k.scopes;
end;
$$;

revoke all on function public.resolve_api_key(text)
  from public, anon, authenticated;
grant execute on function public.resolve_api_key(text) to service_role;
