-- Own immutable keys coexist with read-only ImgChest references during migration.
alter table public.screenshots drop constraint if exists screenshots_image_url_check;
alter table public.diary_entry_images drop constraint if exists diary_entry_images_url_check;
create or replace function public.valid_media_reference(value text, owner uuid, prefix text)
returns boolean language sql immutable set search_path = '' as $$
 select value ~ '^https://(cdn\.)?imgchest\.com/' or
 value ~ ('^' || prefix || '/' || owner::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(avif|webp)$')
$$;
alter table public.screenshots add constraint screenshots_image_url_check
 check (image_url is null or public.valid_media_reference(image_url, profile_id, 'screenshots'));
alter table public.diary_entry_images add constraint diary_entry_images_url_check
 check (public.valid_media_reference(image_url, profile_id, 'journal'));

create table public.media_delete_queue (
 storage_key text primary key, profile_id uuid not null, created_at timestamptz not null default now(),
 check (public.valid_media_reference(storage_key, profile_id, '(avatars|banners|screenshots|journal)') and storage_key !~ '^https://')
);
alter table public.media_delete_queue enable row level security;
revoke all on public.media_delete_queue from anon, authenticated;
grant all on public.media_delete_queue to service_role;
create or replace function public.enqueue_old_media() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid; candidate text;
begin
 owner := case when tg_table_name = 'profiles' then old.id else old.profile_id end;
 for candidate in select jsonb_extract_path_text(to_jsonb(old), v) from unnest(tg_argv) v loop
   if candidate is not null and public.valid_media_reference(candidate, owner, '(avatars|banners|screenshots|journal)') and candidate !~ '^https://' then
     insert into public.media_delete_queue(storage_key,profile_id) values(candidate,owner) on conflict do nothing;
   end if;
 end loop;
 return null;
end $$;
create trigger profile_media_cleanup after update of avatar_url,banner_url or delete on public.profiles
 for each row execute function public.enqueue_old_media('avatar_url','banner_url');
create trigger profile_history_media_cleanup after delete or update of image_url on public.profile_image_history
 for each row execute function public.enqueue_old_media('image_url');
create trigger screenshot_media_cleanup after delete or update of image_url on public.screenshots
 for each row execute function public.enqueue_old_media('image_url');
create trigger journal_media_cleanup after delete or update of image_url on public.diary_entry_images
 for each row execute function public.enqueue_old_media('image_url');

create or replace function public.media_is_referenced(key text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where avatar_url=key or banner_url=key)
 or exists(select 1 from public.profile_image_history where image_url=key)
 or exists(select 1 from public.screenshots where image_url=key)
 or exists(select 1 from public.diary_entry_images where image_url=key)
$$;
revoke all on function public.media_is_referenced(text) from public,anon,authenticated;
grant execute on function public.media_is_referenced(text) to service_role;

-- Profile reference + recent history change together, before cleanup can run.
create or replace function public.replace_profile_media(owner uuid, kind text, key text, reuse boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare resolved public."ProfileImageKind";
begin
 if kind not in ('avatar','banner') then raise exception 'invalid kind' using errcode='22023'; end if;
 resolved := upper(kind)::public."ProfileImageKind";
 perform 1 from public.profiles where id=owner for update;
 if not found then raise exception 'profile not found' using errcode='P0002'; end if;
 if key is not null then
   if reuse then
     perform 1 from public.profile_image_history where profile_id=owner and profile_image_history.kind=resolved and image_url=key for update;
     if not found then raise exception 'unknown history image' using errcode='P0002'; end if;
   elsif not public.valid_media_reference(key,owner,case when kind='avatar' then 'avatars' else 'banners' end) or key ~ '^https://' then
     raise exception 'invalid media key' using errcode='22023';
   end if;
   insert into public.profile_image_history(profile_id,kind,image_url) values(owner,resolved,key)
    on conflict(profile_id,kind,image_url) do update set created_at=clock_timestamp();
   delete from public.profile_image_history where id in
    (select id from public.profile_image_history where profile_id=owner and profile_image_history.kind=resolved order by created_at desc,id desc offset 5);
 end if;
 if kind='avatar' then update public.profiles set avatar_url=key where id=owner;
 else update public.profiles set banner_url=key where id=owner; end if;
end $$;
revoke all on function public.replace_profile_media(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.replace_profile_media(uuid,text,text,boolean) to service_role;

