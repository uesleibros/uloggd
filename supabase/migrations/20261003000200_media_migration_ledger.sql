-- A resumable backfill can reuse a verified object after a partial database update.
create table public.media_migrations (
 profile_id uuid not null, kind text not null, legacy_url text not null, storage_key text not null,
 created_at timestamptz not null default now(), primary key(profile_id,kind,legacy_url),
 check (public.valid_media_reference(storage_key,profile_id,'(avatars|banners|screenshots|journal)') and storage_key !~ '^https://')
);
alter table public.media_migrations enable row level security;
revoke all on public.media_migrations from anon,authenticated;
grant all on public.media_migrations to service_role;
