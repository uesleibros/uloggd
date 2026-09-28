-- The folder visibility rule, as a function rather than a policy loop.
--
-- "A folder is visible when a list inside it is" has to read the join table,
-- and a row of the join table is visible when its list is, which reads the
-- lists, whose policy is fine. The problem was the other direction: writing a
-- row of the join table checks that the folder is yours, which reads the
-- folders, whose policy read the join table again. Postgres answers a loop
-- like that with "infinite recursion detected in policy" and refuses both
-- tables entirely.
--
-- So the rule moves into a `security definer` function, which is the pattern
-- this schema already uses where a policy needs to look at a table that looks
-- back. And, as ever with a definer function: it outranks the policies, so it
-- carries the rule itself rather than trusting the one on `game_lists`. The
-- rule written here is that one, word for word: not blocked, and public, or
-- yours, or followers-only and you follow.

create or replace function public.folder_has_visible_list(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.list_folder_items item
      join public.game_lists l on l.id = item.list_id
     where item.folder_id = target
       and not public.viewer_blocked_with(l.profile_id)
       and (
         l.visibility = 'PUBLIC'
         or l.profile_id = auth.uid()
         or (
           l.visibility = 'FOLLOWERS'
           and exists (
             select 1 from public.follows
              where follower_id = auth.uid() and following_id = l.profile_id
           )
         )
       )
  );
$$;

revoke all on function public.folder_has_visible_list(uuid) from public;
grant execute on function public.folder_has_visible_list(uuid)
  to anon, authenticated;

drop policy if exists "list_folders_visible_read" on public.list_folders;
create policy "list_folders_visible_read" on public.list_folders
  for select to anon, authenticated
  using (
    (select auth.uid()) = profile_id
    or public.folder_has_visible_list(id)
  );
