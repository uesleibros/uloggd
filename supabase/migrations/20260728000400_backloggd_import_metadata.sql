-- Commit the server-owned Backloggd preview with its validated collection
-- memberships and personal rating. Existing library records remain untouched.
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
    select distinct on ((entry ->> 'igdb_id')::integer)
      (entry ->> 'igdb_id')::integer as igdb_id,
      entry ->> 'game_slug' as game_slug,
      (entry ->> 'status')::public."GameStatus" as game_status,
      (entry ->> 'playing')::boolean as playing,
      (entry ->> 'backlog')::boolean as backlog,
      (entry ->> 'wishlist')::boolean as wishlist,
      case
        when jsonb_typeof(entry -> 'quick_rating') = 'number'
          then (entry ->> 'quick_rating')::integer
        else null
      end as quick_rating
    from jsonb_array_elements(candidate.items) entry
    where jsonb_typeof(entry) = 'object'
      and entry ->> 'igdb_id' ~ '^[1-9][0-9]{0,8}$'
      and entry ->> 'game_slug' ~ '^[a-z0-9-]{1,80}$'
      and entry ->> 'status' in ('WISHLIST', 'BACKLOG', 'PLAYING', 'COMPLETED')
      and entry ->> 'playing' in ('true', 'false')
      and entry ->> 'backlog' in ('true', 'false')
      and entry ->> 'wishlist' in ('true', 'false')
      and entry ? 'quick_rating'
      and (
        jsonb_typeof(entry -> 'quick_rating') = 'null'
        or (
          jsonb_typeof(entry -> 'quick_rating') = 'number'
          and entry ->> 'quick_rating' ~ '^(0|[1-9][0-9]?|100)$'
        )
      )
      and (
        entry ->> 'status' = 'COMPLETED'
        or (entry ->> 'status' = 'PLAYING' and entry ->> 'playing' = 'true')
        or (entry ->> 'status' = 'WISHLIST' and entry ->> 'wishlist' = 'true')
        or (entry ->> 'status' = 'BACKLOG' and entry ->> 'backlog' = 'true')
      )
    order by (entry ->> 'igdb_id')::integer
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
    select distinct on ((entry ->> 'igdb_id')::integer)
      (entry ->> 'igdb_id')::integer as igdb_id,
      entry ->> 'game_slug' as game_slug,
      (entry ->> 'status')::public."GameStatus" as game_status,
      (entry ->> 'playing')::boolean as playing,
      (entry ->> 'backlog')::boolean as backlog,
      (entry ->> 'wishlist')::boolean as wishlist,
      case
        when jsonb_typeof(entry -> 'quick_rating') = 'number'
          then (entry ->> 'quick_rating')::integer
        else null
      end as quick_rating
    from jsonb_array_elements(candidate.items) entry
    where jsonb_typeof(entry) = 'object'
      and entry ->> 'igdb_id' ~ '^[1-9][0-9]{0,8}$'
      and entry ->> 'game_slug' ~ '^[a-z0-9-]{1,80}$'
      and entry ->> 'status' in ('WISHLIST', 'BACKLOG', 'PLAYING', 'COMPLETED')
      and entry ->> 'playing' in ('true', 'false')
      and entry ->> 'backlog' in ('true', 'false')
      and entry ->> 'wishlist' in ('true', 'false')
      and entry ? 'quick_rating'
      and (
        jsonb_typeof(entry -> 'quick_rating') = 'null'
        or (
          jsonb_typeof(entry -> 'quick_rating') = 'number'
          and entry ->> 'quick_rating' ~ '^(0|[1-9][0-9]?|100)$'
        )
      )
      and (
        entry ->> 'status' = 'COMPLETED'
        or (entry ->> 'status' = 'PLAYING' and entry ->> 'playing' = 'true')
        or (entry ->> 'status' = 'WISHLIST' and entry ->> 'wishlist' = 'true')
        or (entry ->> 'status' = 'BACKLOG' and entry ->> 'backlog' = 'true')
      )
    order by (entry ->> 'igdb_id')::integer
  )
  insert into public.user_games (
    profile_id,
    igdb_id,
    game_slug,
    status,
    playing,
    backlog,
    wishlist,
    quick_rating
  )
  select
    auth.uid(),
    item.igdb_id,
    item.game_slug,
    item.game_status,
    item.playing,
    item.backlog,
    item.wishlist,
    item.quick_rating
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
