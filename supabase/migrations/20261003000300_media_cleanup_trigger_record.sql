-- A generic trigger cannot bind OLD.profile_id for a profiles record, even in CASE's unused branch.
create or replace function public.enqueue_old_media() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid; candidate text;
begin
 owner := (to_jsonb(old)->>(case when tg_table_name='profiles' then 'id' else 'profile_id' end))::uuid;
 for candidate in select jsonb_extract_path_text(to_jsonb(old), v) from unnest(tg_argv) v loop
   if candidate is not null and public.valid_media_reference(candidate, owner, '(avatars|banners|screenshots|journal)') and candidate !~ '^https://' then
     insert into public.media_delete_queue(storage_key,profile_id) values(candidate,owner) on conflict do nothing;
   end if;
 end loop;
 return null;
end $$;
