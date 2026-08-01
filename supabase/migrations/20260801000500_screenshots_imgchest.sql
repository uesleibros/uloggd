-- Screenshots leave Supabase storage for imgchest, like every other user
-- image here.
--
-- Storage was the odd one out: journal images already went to imgchest, and
-- keeping one surface on a private bucket meant every read of a screenshot
-- needed a signed URL, which is a round trip per image and a second access
-- system to keep in agreement with the row's own visibility rules. The share
-- card that could not draw a screenshot until it learned to sign one was that
-- second system disagreeing.
--
-- `storage_path` stays for now, nullable, so the backfill can run and so a
-- deploy that lands before it does not lose the only pointer to an image.
-- Dropping it is a later migration, once every row carries a URL.

alter table public.screenshots
  add column if not exists image_url text,
  add column if not exists remote_id text;

alter table public.screenshots
  alter column storage_path drop not null;

-- Stored URLs are rendered as images and read back as trusted, so the shape is
-- constrained rather than assumed. Same rule the journal images already use.
alter table public.screenshots
  drop constraint if exists screenshots_image_url_check;
alter table public.screenshots
  add constraint screenshots_image_url_check check (
    image_url is null
    or image_url ~ '^https://(cdn\.)?imgchest\.com/'
  );

-- Every row needs one pointer or the other. Without this a failed upload
-- could leave a screenshot row with no image at all, which renders as a broken
-- frame nobody can fix.
alter table public.screenshots
  drop constraint if exists screenshots_has_image_check;
alter table public.screenshots
  add constraint screenshots_has_image_check check (
    image_url is not null or storage_path is not null
  );

grant select (image_url, remote_id) on public.screenshots to anon, authenticated;
grant insert (image_url, remote_id) on public.screenshots to authenticated;
