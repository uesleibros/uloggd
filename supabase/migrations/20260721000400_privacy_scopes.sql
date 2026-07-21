-- Two more privacy controls, matching what the profile-comment scope already
-- does: who may comment on my lists and reviews, and who may see my profile.

alter table public.profiles
  add column if not exists content_comment_scope text not null default 'EVERYONE',
  add column if not exists profile_visibility text not null default 'EVERYONE';

alter table public.profiles
  drop constraint if exists profiles_content_comment_scope_check;
alter table public.profiles
  add constraint profiles_content_comment_scope_check
  check (content_comment_scope in ('EVERYONE', 'FOLLOWERS', 'NOBODY'));

alter table public.profiles
  drop constraint if exists profiles_profile_visibility_check;
alter table public.profiles
  add constraint profiles_profile_visibility_check
  check (profile_visibility in ('EVERYONE', 'FOLLOWERS'));

grant update (content_comment_scope, profile_visibility)
  on public.profiles to authenticated;

-- Can the viewer see this profile at all? Followers-only profiles stay
-- reachable to the owner and to people who already follow.
create or replace function public.profile_visible(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when target = auth.uid() then true
    when public.users_blocked(auth.uid(), target) then false
    else coalesce(
      (
        select profile.profile_visibility = 'EVERYONE'
          or exists(
            select 1 from public.follows
            where follower_id = auth.uid() and following_id = target
          )
        from public.profiles profile
        where profile.id = target
      ),
      false
    )
  end
$$;

create or replace function public.set_privacy_scopes(
  comment_scope text default null,
  visibility text default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if comment_scope is not null
    and comment_scope not in ('EVERYONE', 'FOLLOWERS', 'NOBODY') then
    raise exception 'invalid scope' using errcode = '22023';
  end if;
  if visibility is not null
    and visibility not in ('EVERYONE', 'FOLLOWERS') then
    raise exception 'invalid visibility' using errcode = '22023';
  end if;

  update public.profiles set
    content_comment_scope = coalesce(comment_scope, content_comment_scope),
    profile_visibility = coalesce(visibility, profile_visibility),
    updated_at = now()
  where id = auth.uid();
  return true;
end;
$$;

-- Commenting on someone's list or review now respects their scope, the same
-- way profile comments already did.
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
declare owner_scope text;
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

  select content_comment_scope into owner_scope
  from public.profiles where id = owner_id;
  if auth.uid() <> owner_id and (
    owner_scope = 'NOBODY'
    or (owner_scope = 'FOLLOWERS' and not exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = owner_id
    ))
  ) then
    raise exception 'comments unavailable' using errcode = '42501';
  end if;

  if parent_comment is not null then
    select * into parent_row from public.content_comments
    where id = parent_comment
      and content_type = target_type
      and content_id = target_id;
    if parent_row.id is null or parent_row.deleted_at is not null then
      raise exception 'parent comment not found' using errcode = 'P0002';
    end if;
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

revoke all on function public.profile_visible(uuid) from public;
revoke all on function public.set_privacy_scopes(text, text) from public, anon;
grant execute on function public.profile_visible(uuid) to anon, authenticated;
grant execute on function public.set_privacy_scopes(text, text) to authenticated;
