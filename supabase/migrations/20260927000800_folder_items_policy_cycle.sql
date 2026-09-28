-- Two policies that asked each other a question.
--
-- A folder is visible when a list inside it is, which reads `list_folder_items`.
-- A row of `list_folder_items` was visible when its folder and its list were,
-- which read `list_folders`. Postgres answers that pair with "infinite
-- recursion detected in policy", and every read of either table failed.
--
-- The folder half was redundant anyway: a row that points at a folder nobody
-- can see joins to nothing, so nothing is revealed by it. The rule that
-- matters is the list, and that is the one kept.

drop policy if exists "list_folder_items_visible_read" on public.list_folder_items;
create policy "list_folder_items_visible_read" on public.list_folder_items
  for select to anon, authenticated
  using (exists (select 1 from public.game_lists l where l.id = list_id));
