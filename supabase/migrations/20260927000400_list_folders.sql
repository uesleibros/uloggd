-- Folders, for people whose lists outgrew one page.
--
-- Thirty lists is a grid you scroll and search. A hundred is a filing
-- problem, and the filters on the page cannot solve it: they ask what a list
-- is (ranking, tierlist, public) rather than what it is for. "Series I am
-- working through", "recommendations for friends", "2026" are the owner's
-- own categories, and nothing the site can infer.
--
-- A folder is a heading and nothing more. It carries no visibility of its
-- own: putting a private list in a folder does not publish it, and putting a
-- public one in does not hide it. That is the whole reason it is a separate
-- table rather than a field on the list: a folder that could also hide things
-- would be a second privacy control, and two privacy controls on one object
-- is how people accidentally publish things.
--
-- A list belongs to at most one folder. Several would be tags, which is a
-- different feature with a different interface, and a list that is in three
-- places at once is not filed.

create table if not exists public.list_folders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- The owner's order, because alphabetical is not what anybody means by
  -- their own shelves. Ties fall back to when it was made.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint list_folders_name_length
    check (char_length(trim(name)) between 1 and 60),
  constraint list_folders_name_unique unique (profile_id, name)
);

create index if not exists list_folders_profile_idx
  on public.list_folders (profile_id, position, created_at);

alter table public.game_lists
  add column if not exists folder_id uuid
    references public.list_folders(id) on delete set null;

-- Filed lists are read one folder at a time, and the unfiled ones are read as
-- "everything with no folder", so the index carries both.
create index if not exists game_lists_folder_idx
  on public.game_lists (profile_id, folder_id);

alter table public.list_folders enable row level security;

-- A folder is visible when a list inside it is.
--
-- Not "when the profile is public": a folder holding nothing but private
-- lists would then be a public heading announcing that private lists exist,
-- and their names are not nothing. The subquery runs under the reader's own
-- policies on `game_lists`, so it answers with exactly what they may see, and
-- an empty folder is the owner's alone.
drop policy if exists "list_folders_visible_read" on public.list_folders;
create policy "list_folders_visible_read" on public.list_folders
  for select to anon, authenticated
  using (
    (select auth.uid()) = profile_id
    or exists (
      select 1 from public.game_lists
      where game_lists.folder_id = list_folders.id
    )
  );

drop policy if exists "list_folders_owner_insert" on public.list_folders;
create policy "list_folders_owner_insert" on public.list_folders
  for insert to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "list_folders_owner_update" on public.list_folders;
create policy "list_folders_owner_update" on public.list_folders
  for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "list_folders_owner_delete" on public.list_folders;
create policy "list_folders_owner_delete" on public.list_folders
  for delete to authenticated
  using ((select auth.uid()) = profile_id);

-- A list can only be filed in its owner's folder.
--
-- The update policy on `game_lists` asks whether the row is yours; it cannot
-- ask whether the folder you are pointing it at is. Without this, filing your
-- list under somebody else's folder id would be accepted, and their folder
-- would quietly start counting a list that is not theirs.
create or replace function public.list_folder_is_own()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.folder_id is null then return new; end if;
  if not exists (
    select 1 from public.list_folders
    where id = new.folder_id and profile_id = new.profile_id
  ) then
    raise exception 'folder not found' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists game_lists_folder_is_own on public.game_lists;
create trigger game_lists_folder_is_own
  before insert or update of folder_id on public.game_lists
  for each row execute function public.list_folder_is_own();

-- Deleting a folder is not deleting what is in it.
--
-- `on delete set null` says so at the column, and it is the honest behaviour:
-- somebody tidying their shelves has not asked to lose the lists on them.
