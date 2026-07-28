create table public.backloggd_imports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_username varchar(32) not null,
  status text not null default 'FETCHING',
  source_count integer not null default 0,
  validated_count integer not null default 0,
  imported_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  error_code varchar(40),
  created_at timestamptz(6) not null default now(),
  expires_at timestamptz(6) not null default (now() + interval '30 minutes'),
  committed_at timestamptz(6),
  constraint backloggd_imports_username_check
    check (source_username ~ '^[A-Za-z0-9_-]{1,32}$'),
  constraint backloggd_imports_status_check
    check (status in ('FETCHING', 'PREVIEWED', 'COMPLETED', 'FAILED')),
  constraint backloggd_imports_counts_check
    check (
      source_count between 0 and 2000
      and validated_count between 0 and source_count
      and imported_count between 0 and validated_count
    ),
  constraint backloggd_imports_items_check
    check (
      case
        when jsonb_typeof(items) = 'array' then jsonb_array_length(items) <= 2000
        else false
      end
    )
);

create index backloggd_imports_profile_created_idx
  on public.backloggd_imports (profile_id, created_at desc);

alter table public.backloggd_imports enable row level security;

-- Preview payloads are server-owned. Authenticated clients can only consume an
-- import through the narrowly scoped function below, never forge IGDB ids.
revoke all on public.backloggd_imports from public, anon, authenticated;
grant all on public.backloggd_imports to service_role;

create or replace function public.commit_backloggd_import(import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate public.backloggd_imports%rowtype;
  valid_count integer := 0;
  existing_count integer := 0;
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into candidate
  from public.backloggd_imports
  where id = import_id and profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  if candidate.status <> 'PREVIEWED' then
    raise exception 'import is not available' using errcode = '22023';
  end if;
  if candidate.expires_at <= now() then
    update public.backloggd_imports
    set status = 'FAILED', error_code = 'preview_expired', items = '[]'::jsonb
    where id = candidate.id;
    raise exception 'import expired' using errcode = '22023';
  end if;

  with valid_items as (
    select distinct
      (entry ->> 'igdb_id')::integer as igdb_id,
      entry ->> 'game_slug' as game_slug
    from jsonb_array_elements(candidate.items) entry
    where jsonb_typeof(entry) = 'object'
      and entry ->> 'igdb_id' ~ '^[1-9][0-9]{0,8}$'
      and entry ->> 'game_slug' ~ '^[a-z0-9-]{1,80}$'
  )
  select count(*)::integer into valid_count from valid_items;

  if valid_count <> candidate.validated_count then
    raise exception 'import validation mismatch' using errcode = '22023';
  end if;

  with valid_items as (
    select distinct (entry ->> 'igdb_id')::integer as igdb_id
    from jsonb_array_elements(candidate.items) entry
    where jsonb_typeof(entry) = 'object'
      and entry ->> 'igdb_id' ~ '^[1-9][0-9]{0,8}$'
      and entry ->> 'game_slug' ~ '^[a-z0-9-]{1,80}$'
  )
  select count(*)::integer into existing_count
  from valid_items item
  join public.user_games game
    on game.profile_id = auth.uid() and game.igdb_id = item.igdb_id;

  with valid_items as (
    select distinct
      (entry ->> 'igdb_id')::integer as igdb_id,
      entry ->> 'game_slug' as game_slug
    from jsonb_array_elements(candidate.items) entry
    where jsonb_typeof(entry) = 'object'
      and entry ->> 'igdb_id' ~ '^[1-9][0-9]{0,8}$'
      and entry ->> 'game_slug' ~ '^[a-z0-9-]{1,80}$'
  )
  insert into public.user_games (
    profile_id,
    igdb_id,
    game_slug,
    status,
    playing,
    backlog,
    wishlist
  )
  select
    auth.uid(),
    item.igdb_id,
    item.game_slug,
    'BACKLOG'::public."GameStatus",
    false,
    false,
    false
  from valid_items item
  on conflict (profile_id, igdb_id) do nothing;

  get diagnostics inserted_count = row_count;

  update public.backloggd_imports
  set
    status = 'COMPLETED',
    imported_count = inserted_count,
    items = '[]'::jsonb,
    error_code = null,
    committed_at = now(),
    expires_at = now()
  where id = candidate.id;

  return jsonb_build_object(
    'sourceCount', candidate.source_count,
    'validatedCount', valid_count,
    'importedCount', inserted_count,
    'existingCount', existing_count
  );
end;
$$;

revoke all on function public.commit_backloggd_import(uuid) from public, anon;
grant execute on function public.commit_backloggd_import(uuid) to authenticated;
