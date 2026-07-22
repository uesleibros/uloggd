-- Give every public community object a compact external identity and one
-- consistent per-post conversation policy.

alter table public.diary_entries add column if not exists public_id text;
alter table public.journeys add column if not exists public_id text;
alter table public.profile_comments add column if not exists public_id text;
alter table public.content_comments add column if not exists public_id text;

update public.diary_entries set public_id = public.new_public_id() where public_id is null;
update public.journeys set public_id = public.new_public_id() where public_id is null;
update public.profile_comments set public_id = public.new_public_id() where public_id is null;
update public.content_comments set public_id = public.new_public_id() where public_id is null;

alter table public.diary_entries alter column public_id set default public.new_public_id();
alter table public.diary_entries alter column public_id set not null;
alter table public.journeys alter column public_id set default public.new_public_id();
alter table public.journeys alter column public_id set not null;
alter table public.profile_comments alter column public_id set default public.new_public_id();
alter table public.profile_comments alter column public_id set not null;
alter table public.content_comments alter column public_id set default public.new_public_id();
alter table public.content_comments alter column public_id set not null;

create unique index if not exists diary_entries_public_id_key on public.diary_entries(public_id);
create unique index if not exists journeys_public_id_key on public.journeys(public_id);
create unique index if not exists profile_comments_public_id_key on public.profile_comments(public_id);
create unique index if not exists content_comments_public_id_key on public.content_comments(public_id);

alter table public.reviews add column if not exists comments_scope text not null default 'EVERYONE';
alter table public.game_lists add column if not exists comments_scope text not null default 'EVERYONE';
alter table public.screenshots add column if not exists comments_scope text not null default 'EVERYONE';
alter table public.diary_entries add column if not exists comments_scope text not null default 'EVERYONE';

alter table public.reviews add constraint reviews_comments_scope_check
  check (comments_scope in ('EVERYONE', 'FOLLOWERS', 'NOBODY'));
alter table public.game_lists add constraint game_lists_comments_scope_check
  check (comments_scope in ('EVERYONE', 'FOLLOWERS', 'NOBODY'));
alter table public.screenshots add constraint screenshots_comments_scope_check
  check (comments_scope in ('EVERYONE', 'FOLLOWERS', 'NOBODY'));
alter table public.diary_entries add constraint diary_entries_comments_scope_check
  check (comments_scope in ('EVERYONE', 'FOLLOWERS', 'NOBODY'));

alter table public.content_comments drop constraint if exists content_comments_type_check;
alter table public.content_comments add constraint content_comments_type_check
  check (content_type in ('list', 'review', 'screenshot', 'diary'));

create or replace function public.content_comments_visible(target_type text, target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case target_type
    when 'list' then exists(select 1 from public.game_lists item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    when 'review' then exists(select 1 from public.reviews item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    when 'screenshot' then exists(select 1 from public.screenshots item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    when 'diary' then exists(select 1 from public.diary_entries item where item.id = target_id
      and not public.users_blocked(auth.uid(), item.profile_id) and (item.visibility = 'PUBLIC' or item.profile_id = auth.uid() or
        (item.visibility = 'FOLLOWERS' and exists(select 1 from public.follows where follower_id = auth.uid() and following_id = item.profile_id))))
    else false end
$$;

create or replace function public.content_comments_owner(target_type text, target_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select case target_type
    when 'list' then (select profile_id from public.game_lists where id = target_id)
    when 'review' then (select profile_id from public.reviews where id = target_id)
    when 'screenshot' then (select profile_id from public.screenshots where id = target_id)
    when 'diary' then (select profile_id from public.diary_entries where id = target_id)
  end
$$;

create or replace function public.content_comments_scope(target_type text, target_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case target_type
    when 'list' then (select comments_scope from public.game_lists where id = target_id)
    when 'review' then (select comments_scope from public.reviews where id = target_id)
    when 'screenshot' then (select comments_scope from public.screenshots where id = target_id)
    when 'diary' then (select comments_scope from public.diary_entries where id = target_id)
  end
$$;

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
declare post_scope text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_type not in ('list', 'review', 'screenshot', 'diary') then raise exception 'invalid target' using errcode = '22023'; end if;
  clean_body := trim(comment_body);
  if char_length(clean_body) not between 1 and 500 or clean_body ~ '[[:cntrl:]]' then raise exception 'invalid comment' using errcode = '22023'; end if;
  if not public.content_comments_visible(target_type, target_id) then raise exception 'content unavailable' using errcode = '42501'; end if;
  owner_id := public.content_comments_owner(target_type, target_id);
  if owner_id is null then raise exception 'content not found' using errcode = 'P0002'; end if;
  select content_comment_scope into owner_scope from public.profiles where id = owner_id;
  post_scope := public.content_comments_scope(target_type, target_id);
  if auth.uid() <> owner_id and (owner_scope = 'NOBODY' or post_scope = 'NOBODY' or
    ((owner_scope = 'FOLLOWERS' or post_scope = 'FOLLOWERS') and not exists(
      select 1 from public.follows where follower_id = auth.uid() and following_id = owner_id
    ))) then raise exception 'comments unavailable' using errcode = '42501'; end if;
  if parent_comment is not null then
    select * into parent_row from public.content_comments where id = parent_comment and content_type = target_type and content_id = target_id;
    if parent_row.id is null or parent_row.deleted_at is not null then raise exception 'parent comment not found' using errcode = 'P0002'; end if;
    with recursive chain as (
      select parent_row.id, parent_row.parent_id, 1 as depth
      union all select parent.id, parent.parent_id, chain.depth + 1 from public.content_comments parent join chain on parent.id = chain.parent_id
    ) select max(depth) into thread_depth from chain;
    if coalesce(thread_depth, 1) >= 3 then raise exception 'reply depth limit' using errcode = '22023'; end if;
  end if;
  insert into public.content_comments(content_type, content_id, author_id, parent_id, body)
  values(target_type, target_id, auth.uid(), parent_comment, clean_body) returning * into result;
  return result;
end;
$$;

revoke all on function public.content_comments_scope(text,uuid) from public;
grant execute on function public.content_comments_scope(text,uuid) to anon, authenticated;

drop function if exists public.get_content_comments(text,uuid);
create function public.get_content_comments(target_type text, target_id uuid)
returns table (
  id uuid, public_id text, parent_id uuid, author_id uuid, body text,
  deleted_at timestamptz, created_at timestamptz, updated_at timestamptz,
  username text, display_name text, avatar_url text, verified boolean,
  like_count bigint, liked_by_viewer boolean
)
language sql stable security definer set search_path = '' as $$
  select comment.id, comment.public_id, comment.parent_id, comment.author_id,
    comment.body::text, comment.deleted_at, comment.created_at, comment.updated_at,
    author.username::text, author.display_name::text, author.avatar_url::text,
    author.verified, count(likes.profile_id)::bigint,
    coalesce(bool_or(likes.profile_id = auth.uid()), false)
  from public.content_comments comment
  join public.profiles author on author.id = comment.author_id
  left join public.content_likes likes on likes.content_type = 'content_comment' and likes.content_id = comment.id
  where comment.content_type = target_type and comment.content_id = target_id
    and public.content_comments_visible(target_type, target_id)
  group by comment.id, author.username, author.display_name, author.avatar_url, author.verified
  order by comment.created_at
$$;
revoke all on function public.get_content_comments(text,uuid) from public;
grant execute on function public.get_content_comments(text,uuid) to anon, authenticated;
