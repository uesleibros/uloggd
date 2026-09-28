-- A folder gets a short id, because its id ends up in the address bar.
--
-- Filtering by a folder put the whole uuid in the URL:
--
--   /lists/someone?folder=8b182b3e-a1e1-4f07-8f80-f8393456f0cd
--
-- Every other thing here that a person can link to has a short public id for
-- exactly this reason, and a folder is now one of those things. The uuid
-- stays as the key and the foreign key; the short one is what travels.

alter table public.list_folders
  add column if not exists public_id text;

update public.list_folders
   set public_id = public.new_public_id()
 where public_id is null;

alter table public.list_folders
  alter column public_id set default public.new_public_id();

alter table public.list_folders
  alter column public_id set not null;

do $$ begin
  alter table public.list_folders
    add constraint list_folders_public_id_format
      check (public_id ~ '^[0-9A-Za-z]{8,24}$');
exception when duplicate_object then null; end $$;

create unique index if not exists list_folders_public_id_key
  on public.list_folders (public_id);
