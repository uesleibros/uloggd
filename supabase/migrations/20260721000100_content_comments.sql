-- Threaded comments on lists and reviews.
--
-- One table keyed by (content_type, content_id) rather than a table per
-- surface, mirroring how content_likes already works here. Adding a third
-- commentable thing later becomes a check-constraint value plus a branch in
-- content_comments_visible, instead of another table, another policy set and
-- another copy of the RPCs that would drift from the first two.

create table public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.content_comments(id) on delete cascade,
  body varchar(500) not null,
  deleted_at timestamptz(6),
  created_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  constraint content_comments_type_check
    check (content_type in ('list', 'review')),
  constraint content_comments_body_check check (
    (deleted_at is not null and body = '')
    or (deleted_at is null and char_length(trim(body)) between 1 and 500)
  )
);

create index content_comments_target_created_idx
  on public.content_comments(content_type, content_id, created_at);
create index content_comments_parent_created_idx
  on public.content_comments(parent_id, created_at);
create index content_comments_author_created_idx
  on public.content_comments(author_id, created_at desc);

-- Comment likes ride the existing generic table. profile_comment is already in
-- use for likes on profile conversations; this adds a distinct value so the two
-- comment systems never collide on the same (type, id) pair.
alter table public.content_likes drop constraint content_likes_type_check;
alter table public.content_likes add constraint content_likes_type_check
  check (content_type in (
    'review', 'diary', 'list', 'profile_comment', 'content_comment'
  ));

-- A comment is readable exactly when the thing it hangs off is readable, so
-- visibility rules live in one place instead of being restated per policy.
create or replace function public.content_comments_visible(
  target_type text,
  target_id uuid
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case target_type
    when 'list' then exists(
      select 1 from public.game_lists list
      where list.id = target_id
        and not public.users_blocked(auth.uid(), list.profile_id)
        and (
          list.visibility = 'PUBLIC'
          or list.profile_id = auth.uid()
          or (list.visibility = 'FOLLOWERS' and exists(
            select 1 from public.follows
            where follower_id = auth.uid() and following_id = list.profile_id
          ))
        )
    )
    when 'review' then exists(
      select 1 from public.reviews review
      where review.id = target_id
        and not public.users_blocked(auth.uid(), review.profile_id)
        and (
          review.visibility = 'PUBLIC'
          or review.profile_id = auth.uid()
          or (review.visibility = 'FOLLOWERS' and exists(
            select 1 from public.follows
            where follower_id = auth.uid() and following_id = review.profile_id
          ))
        )
    )
    else false
  end
$$;

create or replace function public.content_comments_owner(
  target_type text,
  target_id uuid
)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select case target_type
    when 'list' then (select profile_id from public.game_lists where id = target_id)
    when 'review' then (select profile_id from public.reviews where id = target_id)
  end
$$;

alter table public.content_comments enable row level security;
grant select on public.content_comments to anon, authenticated;
grant all privileges on public.content_comments to service_role;

create policy "content_comments_visible_read"
  on public.content_comments for select to anon, authenticated
  using (public.content_comments_visible(content_type, content_id));

-- Writes go through the RPCs below, which enforce depth, blocks and ownership.
create or replace function public.create_content_comment(
  target_type text,
  target_id uuid,
  comment_body text,
  parent_comment uuid default null
)
returns public.content_comments
language plpgsql security definer set search_path = ''
as $$
declare result public.content_comments;
declare clean_body text;
declare parent_row public.content_comments;
declare thread_depth integer;
declare owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if target_type not in ('list', 'review') then
    raise exception 'invalid target' using errcode = '22023';
  end if;
  clean_body := trim(comment_body);
  if char_length(clean_body) not between 1 and 500
    or clean_body ~ '[[:cntrl:]]' then
    raise exception 'invalid comment' using errcode = '22023';
  end if;
  if not public.content_comments_visible(target_type, target_id) then
    raise exception 'content unavailable' using errcode = '42501';
  end if;

  owner_id := public.content_comments_owner(target_type, target_id);
  if owner_id is null then
    raise exception 'content not found' using errcode = 'P0002';
  end if;
  if public.users_blocked(auth.uid(), owner_id) then
    raise exception 'interaction unavailable' using errcode = '42501';
  end if;

  if parent_comment is not null then
    select * into parent_row from public.content_comments
    where id = parent_comment
      and content_type = target_type
      and content_id = target_id;
    if parent_row.id is null or parent_row.deleted_at is not null then
      raise exception 'parent comment not found' using errcode = 'P0002';
    end if;
    -- Same ceiling as profile conversations: three levels, then replies
    -- attach to the level above instead of nesting forever.
    with recursive chain as (
      select parent_row.id as id, parent_row.parent_id as parent_id, 1 as depth
      union all
      select parent.id, parent.parent_id, chain.depth + 1
      from public.content_comments parent
      join chain on parent.id = chain.parent_id
    )
    select max(depth) into thread_depth from chain;
    if coalesce(thread_depth, 1) >= 3 then
      raise exception 'reply depth limit' using errcode = '22023';
    end if;
  end if;

  insert into public.content_comments(
    content_type, content_id, author_id, parent_id, body
  ) values (
    target_type, target_id, auth.uid(), parent_comment, clean_body
  ) returning * into result;
  return result;
end;
$$;

-- Soft deletion: the row stays so replies underneath keep their place in the
-- thread, the way profile comments already behave.
create or replace function public.delete_content_comment(target_comment uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare row_data public.content_comments;
declare owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select * into row_data from public.content_comments where id = target_comment;
  if row_data.id is null or row_data.deleted_at is not null then return false; end if;
  owner_id := public.content_comments_owner(row_data.content_type, row_data.content_id);
  if auth.uid() <> row_data.author_id and auth.uid() <> owner_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.content_comments
  set body = '', deleted_at = now(), updated_at = now()
  where id = target_comment;
  return true;
end;
$$;

create or replace function public.get_content_comments(
  target_type text,
  target_id uuid
)
returns table (
  id uuid,
  parent_id uuid,
  author_id uuid,
  body text,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  username text,
  display_name text,
  avatar_url text,
  verified boolean,
  like_count bigint,
  liked_by_viewer boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    comment.id,
    comment.parent_id,
    comment.author_id,
    comment.body::text,
    comment.deleted_at,
    comment.created_at,
    comment.updated_at,
    author.username::text,
    author.display_name::text,
    author.avatar_url::text,
    author.verified,
    count(likes.profile_id)::bigint,
    coalesce(bool_or(likes.profile_id = auth.uid()), false)
  from public.content_comments comment
  join public.profiles author on author.id = comment.author_id
  left join public.content_likes likes
    on likes.content_type = 'content_comment' and likes.content_id = comment.id
  where comment.content_type = target_type
    and comment.content_id = target_id
    and public.content_comments_visible(target_type, target_id)
  group by comment.id, author.username, author.display_name,
    author.avatar_url, author.verified
  order by comment.created_at
$$;

revoke all on function public.content_comments_visible(text,uuid) from public;
revoke all on function public.content_comments_owner(text,uuid) from public;
revoke all on function public.create_content_comment(text,uuid,text,uuid)
  from public, anon;
revoke all on function public.delete_content_comment(uuid) from public, anon;
revoke all on function public.get_content_comments(text,uuid) from public;

grant execute on function public.content_comments_visible(text,uuid)
  to anon, authenticated;
grant execute on function public.get_content_comments(text,uuid)
  to anon, authenticated;
grant execute on function public.create_content_comment(text,uuid,text,uuid)
  to authenticated;
grant execute on function public.delete_content_comment(uuid) to authenticated;
