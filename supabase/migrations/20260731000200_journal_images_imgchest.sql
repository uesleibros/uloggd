-- Journal images move off Supabase Storage and onto imgchest, the host the
-- platform already uses for avatars and banners.
--
-- Consequence worth stating in the schema: an imgchest link is reachable by
-- anyone holding it. RLS still decides who can read the row (and therefore who
-- is shown the image in the app), but it no longer gates the bytes the way a
-- signed URL from a private bucket did. A PRIVATE entry's images are protected
-- by URL obscurity from here on.

alter table public.diary_entry_images
  add column if not exists image_url text,
  add column if not exists remote_id text;

-- The bucket rows never went public, so there is nothing to migrate: drop the
-- few that exist rather than leave rows pointing at a path nothing reads.
delete from public.diary_entry_images where image_url is null;

alter table public.diary_entry_images
  drop column if exists storage_path;

alter table public.diary_entry_images
  alter column image_url set not null;

alter table public.diary_entry_images
  drop constraint if exists diary_entry_images_url_check;
alter table public.diary_entry_images
  add constraint diary_entry_images_url_check
  check (image_url ~ '^https://(cdn\.)?imgchest\.com/');

-- Storage reads go back to screenshots only.
drop policy if exists "screenshot_files_visible_read" on storage.objects;
create policy "screenshot_files_visible_read" on storage.objects
for select to anon, authenticated using (
  bucket_id = 'screenshots' and public.screenshot_file_visible(name)
);

drop function if exists public.diary_image_file_visible(text);
