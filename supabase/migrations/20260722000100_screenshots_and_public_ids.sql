-- Short public URLs and private screenshot media.

create or replace function public.new_public_id(size integer default 10)
returns text
language plpgsql volatile set search_path = ''
as $$
declare alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
declare entropy bytea := extensions.gen_random_bytes(size);
declare result text := '';
declare position integer;
begin
  if size not between 8 and 24 then
    raise exception 'invalid public id size' using errcode = '22023';
  end if;
  for position in 0..size - 1 loop
    result := result || substr(alphabet, (get_byte(entropy, position) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

alter table public.reviews add column if not exists public_id text;
alter table public.game_lists add column if not exists public_id text;
update public.reviews set public_id = public.new_public_id() where public_id is null;
update public.game_lists set public_id = public.new_public_id() where public_id is null;
alter table public.reviews alter column public_id set default public.new_public_id();
alter table public.reviews alter column public_id set not null;
alter table public.game_lists alter column public_id set default public.new_public_id();
alter table public.game_lists alter column public_id set not null;
alter table public.reviews add constraint reviews_public_id_format
  check (public_id ~ '^[23456789A-HJ-NP-Za-km-z]{10}$');
alter table public.game_lists add constraint game_lists_public_id_format
  check (public_id ~ '^[23456789A-HJ-NP-Za-km-z]{10}$');
create unique index reviews_public_id_key on public.reviews(public_id);
create unique index game_lists_public_id_key on public.game_lists(public_id);

create table public.screenshots (
  id uuid primary key default gen_random_uuid(),
  public_id text not null default public.new_public_id(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  igdb_id integer not null check (igdb_id > 0),
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,80}$'),
  storage_path text not null,
  description varchar(2200),
  contains_spoilers boolean not null default false,
  visibility public."Visibility" not null default 'PUBLIC',
  width integer not null check (width between 1 and 2560),
  height integer not null check (height between 1 and 2560),
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  constraint screenshots_public_id_key unique(public_id),
  constraint screenshots_public_id_format
    check (public_id ~ '^[23456789A-HJ-NP-Za-km-z]{10}$'),
  constraint screenshots_storage_path_check
    check (storage_path = profile_id::text || '/' || id::text || '.webp'),
  constraint screenshots_description_check
    check (description is null or char_length(trim(description)) between 1 and 2200)
);

create index screenshots_profile_created_idx
  on public.screenshots(profile_id, created_at desc);
create index screenshots_game_created_idx
  on public.screenshots(igdb_id, created_at desc);
create index screenshots_public_created_idx
  on public.screenshots(created_at desc) where visibility = 'PUBLIC';

alter table public.screenshots enable row level security;
grant select, insert, update, delete on public.screenshots to authenticated;
grant select on public.screenshots to anon;
grant all privileges on public.screenshots to service_role;

create policy "screenshots_visible_read" on public.screenshots
for select to anon, authenticated using (
  not public.users_blocked(auth.uid(), profile_id)
  and (
    visibility = 'PUBLIC'
    or profile_id = auth.uid()
    or (visibility = 'FOLLOWERS' and exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = profile_id
    ))
  )
);
create policy "screenshots_owner_insert" on public.screenshots
for insert to authenticated with check (profile_id = auth.uid());
create policy "screenshots_owner_update" on public.screenshots
for update to authenticated using (profile_id = auth.uid())
with check (profile_id = auth.uid());
create policy "screenshots_owner_delete" on public.screenshots
for delete to authenticated using (profile_id = auth.uid());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 8388608, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "screenshot_files_owner_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.screenshot_file_visible(target_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.screenshots item
    where item.storage_path = target_path
      and not public.users_blocked(auth.uid(), item.profile_id)
      and (
        item.visibility = 'PUBLIC'
        or item.profile_id = auth.uid()
        or (item.visibility = 'FOLLOWERS' and exists(
          select 1 from public.follows
          where follower_id = auth.uid() and following_id = item.profile_id
        ))
      )
  )
$$;

create policy "screenshot_files_visible_read" on storage.objects
for select to anon, authenticated using (
  bucket_id = 'screenshots' and public.screenshot_file_visible(name)
);
create policy "screenshot_files_owner_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text
);

alter table public.content_likes drop constraint if exists content_likes_type_check;
alter table public.content_likes add constraint content_likes_type_check
  check (content_type in (
    'review', 'diary', 'list', 'profile_comment', 'content_comment', 'screenshot'
  ));
alter table public.content_comments drop constraint if exists content_comments_type_check;
alter table public.content_comments add constraint content_comments_type_check
  check (content_type in ('list', 'review', 'screenshot'));

create or replace function public.content_comments_visible(target_type text, target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case target_type
    when 'list' then exists(
      select 1 from public.game_lists item where item.id = target_id
        and not public.users_blocked(auth.uid(), item.profile_id)
        and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
          (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows
            where follower_id = auth.uid() and following_id = item.profile_id)))
    )
    when 'review' then exists(
      select 1 from public.reviews item where item.id = target_id
        and not public.users_blocked(auth.uid(), item.profile_id)
        and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
          (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows
            where follower_id = auth.uid() and following_id = item.profile_id)))
    )
    when 'screenshot' then exists(
      select 1 from public.screenshots item where item.id = target_id
        and not public.users_blocked(auth.uid(), item.profile_id)
        and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
          (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows
            where follower_id = auth.uid() and following_id = item.profile_id)))
    )
    else false
  end
$$;

create or replace function public.content_comments_owner(target_type text, target_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select case target_type
    when 'list' then (select profile_id from public.game_lists where id = target_id)
    when 'review' then (select profile_id from public.reviews where id = target_id)
    when 'screenshot' then (select profile_id from public.screenshots where id = target_id)
  end
$$;

create or replace function public.toggle_content_like(target_type text, target_id uuid)
returns table(liked boolean, like_count bigint)
language plpgsql security definer set search_path = '' as $$
declare visible boolean;
declare now_liked boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_type = 'screenshot' then
    select exists(select 1 from public.screenshots item
      where item.id = target_id and item.profile_id <> auth.uid()
        and public.content_comments_visible('screenshot', item.id)) into visible;
  elsif target_type = 'review' then
    select exists(select 1 from public.reviews item
      where item.id = target_id and item.profile_id <> auth.uid()
        and public.content_comments_visible('review', item.id)) into visible;
  elsif target_type = 'list' then
    select exists(select 1 from public.game_lists item
      where item.id = target_id and item.profile_id <> auth.uid()
        and public.content_comments_visible('list', item.id)) into visible;
  elsif target_type = 'diary' then
    select exists(select 1 from public.diary_entries item where item.id = target_id
      and item.profile_id <> auth.uid() and not public.users_blocked(auth.uid(), item.profile_id)
      and (item.visibility = 'PUBLIC' or (item.visibility = 'FOLLOWERS' and exists(
        select 1 from public.follows where follower_id = auth.uid()
          and following_id = item.profile_id)))) into visible;
  elsif target_type = 'profile_comment' then
    select exists(select 1 from public.profile_comments item where item.id = target_id
      and item.author_id <> auth.uid() and item.deleted_at is null
      and not public.users_blocked(auth.uid(), item.author_id)
      and not public.users_blocked(auth.uid(), item.profile_id)) into visible;
  elsif target_type = 'content_comment' then
    select exists(select 1 from public.content_comments item where item.id = target_id
      and item.author_id <> auth.uid() and item.deleted_at is null
      and public.content_comments_visible(item.content_type, item.content_id)) into visible;
  else
    raise exception 'invalid content type' using errcode = '22023';
  end if;
  if not visible then raise exception 'content not found' using errcode = 'P0002'; end if;
  delete from public.content_likes where profile_id = auth.uid()
    and content_type = target_type and content_id = target_id;
  if found then now_liked := false;
  else
    insert into public.content_likes(profile_id, content_type, content_id)
    values(auth.uid(), target_type, target_id);
    now_liked := true;
  end if;
  return query select now_liked, count(*)::bigint from public.content_likes
    where content_type = target_type and content_id = target_id;
end;
$$;

-- Extend the latest comment writer with screenshot ownership and visibility.
create or replace function public.create_content_comment(
  target_type text, target_id uuid, comment_body text, parent_comment uuid default null
)
returns public.content_comments language plpgsql security definer set search_path = '' as $$
declare result public.content_comments;
declare clean_body text;
declare parent_row public.content_comments;
declare thread_depth integer;
declare owner_id uuid;
declare owner_scope text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_type not in ('list', 'review', 'screenshot') then raise exception 'invalid target' using errcode = '22023'; end if;
  clean_body := trim(comment_body);
  if char_length(clean_body) not between 1 and 500 or clean_body ~ '[[:cntrl:]]' then
    raise exception 'invalid comment' using errcode = '22023';
  end if;
  if not public.content_comments_visible(target_type, target_id) then raise exception 'content unavailable' using errcode = '42501'; end if;
  owner_id := public.content_comments_owner(target_type, target_id);
  if owner_id is null then raise exception 'content not found' using errcode = 'P0002'; end if;
  select content_comment_scope into owner_scope from public.profiles where id = owner_id;
  if auth.uid() <> owner_id and (owner_scope = 'NOBODY' or
    (owner_scope = 'FOLLOWERS' and not exists(select 1 from public.follows
      where follower_id = auth.uid() and following_id = owner_id))) then
    raise exception 'comments unavailable' using errcode = '42501';
  end if;
  if parent_comment is not null then
    select * into parent_row from public.content_comments where id = parent_comment
      and content_type = target_type and content_id = target_id;
    if parent_row.id is null or parent_row.deleted_at is not null then raise exception 'parent comment not found' using errcode = 'P0002'; end if;
    with recursive chain as (
      select parent_row.id, parent_row.parent_id, 1 as depth
      union all select parent.id, parent.parent_id, chain.depth + 1
      from public.content_comments parent join chain on parent.id = chain.parent_id
    ) select max(depth) into thread_depth from chain;
    if coalesce(thread_depth, 1) >= 3 then raise exception 'reply depth limit' using errcode = '22023'; end if;
  end if;
  insert into public.content_comments(content_type, content_id, author_id, parent_id, body)
  values(target_type, target_id, auth.uid(), parent_comment, clean_body)
  returning * into result;
  return result;
end;
$$;

revoke all on function public.new_public_id(integer) from public, anon, authenticated;
revoke all on function public.screenshot_file_visible(text) from public;
grant execute on function public.screenshot_file_visible(text) to anon, authenticated;
