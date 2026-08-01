-- Supabase Storage leaves the schema entirely.
--
-- The five rows that still pointed at the bucket were deleted: the bucket was
-- removed and their files were unrecoverable, so they were rows describing
-- images that no longer existed. Nothing points at storage any more, and by
-- decision nothing ever will again: every image here goes to imgchest.
--
-- With the column gone, `image_url` can be required. That is worth more than it
-- looks: a screenshot row without an image was previously possible, and the
-- page had to carry a branch for it. Now the type says it cannot happen.

alter table public.screenshots
  drop constraint if exists screenshots_has_image_check;

alter table public.screenshots
  drop column if exists storage_path;

-- Safe to require now that the table holds no rows without one. Any future row
-- comes from the upload route, which writes the URL or refuses the insert.
alter table public.screenshots
  alter column image_url set not null;

-- The bucket is gone, so the policy that guarded it guards nothing. Left
-- behind it would be a rule nobody can read the purpose of.
drop policy if exists "screenshot_files_visible_read" on storage.objects;
drop policy if exists "screenshot_files_owner_insert" on storage.objects;
drop policy if exists "screenshot_files_owner_delete" on storage.objects;
