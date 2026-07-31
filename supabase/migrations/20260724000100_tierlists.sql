-- Tierlists. A tierlist is a game_list with kind = 'TIERLIST': it reuses the
-- list's identity, visibility, likes, comments and reports untouched, and adds
-- two side tables for the board itself. game_list_items stays empty for a
-- tierlist; tierlist_tiers/tierlist_items hold the ranking.
--
-- Library sync is not a trigger: tier items are filtered against the owner's
-- user_games at read and at save, so a game leaving the library simply stops
-- appearing on the board, even if it was placed in a tier, and reappears in
-- its tier if the game returns.

alter table public.game_lists
  add column if not exists kind text not null default 'COLLECTION'
  check (kind in ('COLLECTION', 'TIERLIST'));

create table if not exists public.tierlist_tiers (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.game_lists(id) on delete cascade,
  label text not null,
  color text not null,
  position integer not null default 0,
  created_at timestamptz(6) not null default now()
);
create index if not exists tierlist_tiers_list_position_idx
  on public.tierlist_tiers(list_id, position);

create table if not exists public.tierlist_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.game_lists(id) on delete cascade,
  tier_id uuid not null references public.tierlist_tiers(id) on delete cascade,
  igdb_id integer not null,
  game_slug text not null,
  position integer not null default 0,
  created_at timestamptz(6) not null default now(),
  constraint tierlist_items_list_id_igdb_id_key unique (list_id, igdb_id)
);
create index if not exists tierlist_items_tier_position_idx
  on public.tierlist_items(tier_id, position);

alter table public.tierlist_tiers enable row level security;
alter table public.tierlist_items enable row level security;

grant select on public.tierlist_tiers, public.tierlist_items to anon;
grant select, insert, update, delete
  on public.tierlist_tiers, public.tierlist_items to authenticated;
grant all privileges
  on public.tierlist_tiers, public.tierlist_items to service_role;

-- Read follows the parent list's visibility, exactly like game_list_items.
-- Writes go only through save_tierlist (security definer), but owner policies
-- are kept so the tables are consistent with the rest of the schema.
create policy "tierlist_tiers_visible_read" on public.tierlist_tiers
  for select to anon, authenticated using (
    exists (
      select 1 from public.game_lists
      where game_lists.id = list_id
        and (game_lists.visibility = 'PUBLIC'
          or game_lists.profile_id = (select auth.uid()))
    )
  );
create policy "tierlist_tiers_owner_write" on public.tierlist_tiers
  for all to authenticated using (
    exists (
      select 1 from public.game_lists
      where game_lists.id = list_id
        and game_lists.profile_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.game_lists
      where game_lists.id = list_id
        and game_lists.profile_id = (select auth.uid())
    )
  );
create policy "tierlist_items_visible_read" on public.tierlist_items
  for select to anon, authenticated using (
    exists (
      select 1 from public.game_lists
      where game_lists.id = list_id
        and (game_lists.visibility = 'PUBLIC'
          or game_lists.profile_id = (select auth.uid()))
    )
  );
create policy "tierlist_items_owner_write" on public.tierlist_items
  for all to authenticated using (
    exists (
      select 1 from public.game_lists
      where game_lists.id = list_id
        and game_lists.profile_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.game_lists
      where game_lists.id = list_id
        and game_lists.profile_id = (select auth.uid())
    )
  );

-- create_game_list gains list_kind. A new tierlist is seeded with the classic
-- S/A/B/C/D rows so the editor opens on a real board, never a blank canvas.
drop function if exists public.create_game_list(text, text, public."Visibility", boolean);
create or replace function public.create_game_list(
  list_name text,
  list_description text default null,
  list_visibility public."Visibility" default 'PUBLIC',
  list_ranked boolean default false,
  list_kind text default 'COLLECTION'
)
returns public.game_lists
language plpgsql security definer set search_path = ''
as $$
declare
  result public.game_lists;
  clean_kind text := case when list_kind = 'TIERLIST' then 'TIERLIST' else 'COLLECTION' end;
  seed jsonb := '[
    {"label":"S","color":"#e35d6a"},
    {"label":"A","color":"#f0883e"},
    {"label":"B","color":"#e3b341"},
    {"label":"C","color":"#57ab5a"},
    {"label":"D","color":"#539bf5"}
  ]'::jsonb;
  tier jsonb;
  idx integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(list_name)) not between 1 and 100 then raise exception 'invalid name' using errcode = '22023'; end if;
  if char_length(trim(coalesce(list_description, ''))) > 500 then raise exception 'description too long' using errcode = '22023'; end if;
  insert into public.game_lists(profile_id, name, description, visibility, ranked, kind)
  values(
    auth.uid(), trim(list_name), nullif(trim(list_description), ''),
    list_visibility,
    case when clean_kind = 'TIERLIST' then false else coalesce(list_ranked, false) end,
    clean_kind
  )
  returning * into result;
  if clean_kind = 'TIERLIST' then
    for tier in select * from jsonb_array_elements(seed) loop
      insert into public.tierlist_tiers(list_id, label, color, position)
      values(result.id, tier->>'label', tier->>'color', idx);
      idx := idx + 1;
    end loop;
  end if;
  return result;
end;
$$;
revoke all on function public.create_game_list(text, text, public."Visibility", boolean, text) from public, anon;
grant execute on function public.create_game_list(text, text, public."Visibility", boolean, text) to authenticated;

-- Replaces the whole board in one transaction: the client owns tier ids
-- (crypto.randomUUID), so items keep referencing their tier across the wipe.
-- Only games still in the owner's library are written, which is half of the
-- library-sync guarantee; the read side enforces the other half.
create or replace function public.save_tierlist(
  target_list uuid,
  tiers jsonb,
  items jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid;
  list_kind text;
  tier jsonb;
  item jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select profile_id, kind into owner, list_kind
  from public.game_lists where id = target_list;
  if owner is null then raise exception 'list not found' using errcode = 'P0002'; end if;
  if owner <> auth.uid() then raise exception 'not the owner' using errcode = '42501'; end if;
  if list_kind <> 'TIERLIST' then raise exception 'not a tierlist' using errcode = '22023'; end if;
  if jsonb_array_length(coalesce(tiers, '[]'::jsonb)) > 26 then
    raise exception 'too many tiers' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(items, '[]'::jsonb)) > 1000 then
    raise exception 'too many items' using errcode = '22023';
  end if;

  delete from public.tierlist_items where list_id = target_list;
  delete from public.tierlist_tiers where list_id = target_list;

  for tier in select * from jsonb_array_elements(coalesce(tiers, '[]'::jsonb)) loop
    insert into public.tierlist_tiers(id, list_id, label, color, position)
    values(
      (tier->>'id')::uuid,
      target_list,
      left(coalesce(nullif(trim(tier->>'label'), ''), '?'), 30),
      case when tier->>'color' ~ '^#[0-9a-fA-F]{6}$' then tier->>'color' else '#8b949e' end,
      coalesce((tier->>'position')::integer, 0)
    );
  end loop;

  for item in select * from jsonb_array_elements(coalesce(items, '[]'::jsonb)) loop
    -- Skips a game that has left the library, or whose tier was not in the set.
    insert into public.tierlist_items(list_id, tier_id, igdb_id, game_slug, position)
    select
      target_list,
      (item->>'tier_id')::uuid,
      (item->>'igdb_id')::integer,
      item->>'game_slug',
      coalesce((item->>'position')::integer, 0)
    where exists (
      select 1 from public.tierlist_tiers t
      where t.id = (item->>'tier_id')::uuid and t.list_id = target_list
    )
    and exists (
      select 1 from public.user_games g
      where g.profile_id = auth.uid()
        and g.igdb_id = (item->>'igdb_id')::integer
    )
    on conflict (list_id, igdb_id) do nothing;
  end loop;

  update public.game_lists set updated_at = now() where id = target_list;
end;
$$;
revoke all on function public.save_tierlist(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_tierlist(uuid, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
