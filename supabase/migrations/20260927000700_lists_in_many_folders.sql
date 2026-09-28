-- A list can be in more than one folder.
--
-- One folder was the smaller assumption and it was wrong in the ordinary
-- case: "Zelda" and "2026" are both true of the same list, and filing it
-- under one of them means the other shelf is missing something that belongs
-- on it. Backloggd lets a list sit in several, and so does this now.
--
-- It is still filing rather than tagging: a folder is a heading somebody put
-- over some of their lists, with no visibility of its own, and the only thing
-- that changes here is how many headings one list may appear under.
--
-- The membership moves to a table of its own, because that is what it became:
-- a column could only ever hold one answer, and keeping it beside the new
-- table would leave two places that disagree.

create table if not exists public.list_folder_items (
  folder_id uuid not null references public.list_folders(id) on delete cascade,
  list_id uuid not null references public.game_lists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, list_id)
);

-- Read one way and the other: everything in this folder, and every folder
-- this list is in.
create index if not exists list_folder_items_list_idx
  on public.list_folder_items (list_id);

insert into public.list_folder_items (folder_id, list_id)
select folder_id, id from public.game_lists where folder_id is not null
on conflict do nothing;

alter table public.list_folder_items enable row level security;

-- A row here is only ever about one person's own things: their folder, their
-- list. The read follows the folder, which is visible when a list inside it
-- is, so somebody who can see a list can see that it is filed and where.
drop policy if exists "list_folder_items_visible_read" on public.list_folder_items;
create policy "list_folder_items_visible_read" on public.list_folder_items
  for select to anon, authenticated
  using (
    exists (select 1 from public.game_lists l where l.id = list_id)
    and exists (select 1 from public.list_folders f where f.id = folder_id)
  );

drop policy if exists "list_folder_items_owner_insert" on public.list_folder_items;
create policy "list_folder_items_owner_insert" on public.list_folder_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.list_folders f
      where f.id = folder_id and f.profile_id = (select auth.uid())
    )
    and exists (
      select 1 from public.game_lists l
      where l.id = list_id and l.profile_id = (select auth.uid())
    )
  );

drop policy if exists "list_folder_items_owner_delete" on public.list_folder_items;
create policy "list_folder_items_owner_delete" on public.list_folder_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.list_folders f
      where f.id = folder_id and f.profile_id = (select auth.uid())
    )
  );

-- A folder is still visible when a list inside it is, asked through the join
-- table now. Rewritten before the column goes, because the old policy reads
-- it and a policy is one of the things that holds a column in place.
drop policy if exists "list_folders_visible_read" on public.list_folders;
create policy "list_folders_visible_read" on public.list_folders
  for select to anon, authenticated
  using (
    (select auth.uid()) = profile_id
    or exists (
      select 1
        from public.list_folder_items item
        join public.game_lists l on l.id = item.list_id
       where item.folder_id = list_folders.id
    )
  );

-- The column, its trigger and its index go: the join table is the answer now,
-- and a second place to write it is a second place to be wrong.
drop trigger if exists game_lists_folder_is_own on public.game_lists;
drop function if exists public.list_folder_is_own();
drop index if exists public.game_lists_folder_idx;
alter table public.game_lists drop column if exists folder_id;
