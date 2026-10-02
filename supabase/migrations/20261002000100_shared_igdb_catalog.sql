-- Public catalogue cache shared by application workers, not viewer state.
create schema if not exists private;
create table private.igdb_catalog_cache (
  cache_key text primary key check (length(cache_key) between 1 and 200),
  data jsonb check (data is null or jsonb_typeof(data) = 'array'),
  fetched_at timestamptz,
  refresh_token uuid,
  refresh_until timestamptz not null default '-infinity',
  error_code text check (error_code in ('rate_limited', 'unavailable')),
  bytes integer not null default 0 check (bytes between 0 and 8388608),
  updated_at timestamptz not null default now(),
  check ((data is null) = (fetched_at is null))
);
create index igdb_catalog_cache_updated_idx on private.igdb_catalog_cache (updated_at);
alter table private.igdb_catalog_cache enable row level security;
revoke all on private.igdb_catalog_cache from public, anon, authenticated;
grant all on private.igdb_catalog_cache to service_role;
