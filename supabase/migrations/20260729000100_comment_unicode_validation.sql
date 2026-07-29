-- Keep comment validation identical across the browser and PostgreSQL.
-- Newlines and tabs are valid writing characters; every other control byte
-- stays rejected. PostgreSQL char_length counts Unicode code points, matching
-- the browser counter used by the comment composers.

create or replace function public.normalize_comment_body(comment_body text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare clean_body text;
begin
  clean_body := replace(
    replace(coalesce(comment_body, ''), chr(13) || chr(10), chr(10)),
    chr(13),
    chr(10)
  );
  clean_body := btrim(clean_body, E' \t\n\r');

  if char_length(clean_body) not between 1 and 500
    or regexp_replace(clean_body, E'[\t\n]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception 'invalid comment' using errcode = '22023';
  end if;

  return clean_body;
end;
$$;

revoke all on function public.normalize_comment_body(text)
  from public, anon, authenticated;

create or replace function public.create_profile_comment(
  target_profile uuid,
  comment_body text,
  parent_comment uuid default null
)
returns public.profile_comments
language plpgsql security definer set search_path = ''
as $$
declare target_scope text;
declare result public.profile_comments;
declare clean_body text;
declare parent_row public.profile_comments;
declare thread_depth integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  clean_body := public.normalize_comment_body(comment_body);
  if public.users_blocked(auth.uid(), target_profile) then
    raise exception 'interaction unavailable' using errcode = '42501';
  end if;
  select profile_comment_scope into target_scope
  from public.profiles where id = target_profile;
  if target_scope is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  if auth.uid() <> target_profile and (
    target_scope = 'NOBODY'
    or (target_scope = 'FOLLOWERS' and not exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = target_profile
    ))
  ) then raise exception 'comments unavailable' using errcode = '42501'; end if;

  if parent_comment is not null then
    select * into parent_row from public.profile_comments
    where id = parent_comment and profile_id = target_profile;
    if parent_row.id is null then
      raise exception 'parent comment not found' using errcode = 'P0002';
    end if;
    if parent_row.deleted_at is not null then
      raise exception 'parent comment removed' using errcode = 'P0002';
    end if;
    with recursive ancestors as (
      select id, parent_id, 1 as depth
      from public.profile_comments where id = parent_comment
      union all
      select parent.id, parent.parent_id, ancestors.depth + 1
      from public.profile_comments parent
      join ancestors on parent.id = ancestors.parent_id
      where ancestors.depth < 8
    )
    select max(depth) into thread_depth from ancestors;
    if coalesce(thread_depth, 0) >= 6 then
      raise exception 'thread depth limit' using errcode = '22023';
    end if;
  end if;

  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 minute') >= 5
  then raise exception 'comment rate limit' using errcode = 'P0001'; end if;
  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 day') >= 40
  then raise exception 'daily comment limit' using errcode = 'P0001'; end if;

  insert into public.profile_comments(profile_id, author_id, body, parent_id)
  values(target_profile, auth.uid(), clean_body, parent_comment)
  returning * into result;
  return result;
end;
$$;

create or replace function public.update_profile_comment(
  target_comment uuid,
  comment_body text
)
returns public.profile_comments
language plpgsql security definer set search_path = ''
as $$
declare result public.profile_comments;
declare clean_body text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  clean_body := public.normalize_comment_body(comment_body);
  update public.profile_comments
  set body = clean_body, updated_at = now()
  where id = target_comment and author_id = auth.uid() and deleted_at is null
  returning * into result;
  if result.id is null then raise exception 'comment not found' using errcode = 'P0002'; end if;
  return result;
end;
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
  clean_body := public.normalize_comment_body(comment_body);
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

create or replace function public.update_content_comment(
  target_comment uuid,
  comment_body text
)
returns public.content_comments
language plpgsql security definer set search_path = ''
as $$
declare result public.content_comments;
declare clean_body text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  clean_body := public.normalize_comment_body(comment_body);
  update public.content_comments
  set body = clean_body, updated_at = now()
  where id = target_comment
    and author_id = auth.uid()
    and deleted_at is null
  returning * into result;
  if result.id is null then
    raise exception 'comment not found or not allowed' using errcode = '42501';
  end if;
  return result;
end;
$$;

revoke all on function public.create_profile_comment(uuid,text,uuid)
  from public, anon;
revoke all on function public.update_profile_comment(uuid,text)
  from public, anon;
revoke all on function public.create_content_comment(text,uuid,text,uuid)
  from public, anon;
revoke all on function public.update_content_comment(uuid,text)
  from public, anon;
grant execute on function public.create_profile_comment(uuid,text,uuid)
  to authenticated;
grant execute on function public.update_profile_comment(uuid,text)
  to authenticated;
grant execute on function public.create_content_comment(text,uuid,text,uuid)
  to authenticated;
grant execute on function public.update_content_comment(uuid,text)
  to authenticated;
