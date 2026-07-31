-- One owner-facing switch for who may comment on a post.
--
-- `comments_scope` has existed on reviews, lists, screenshots and journal
-- entries since the unified community posts pass, but only the journal editor
-- ever set it. Reviews and lists were left on the default and screenshots were
-- written with 'EVERYONE' hard-coded in the upload route, so an author could
-- not close comments on their own post no matter what the schema allowed.
--
-- A small shared function rather than new parameters on create_review and
-- update_review: those are long validators that would have to be recreated
-- wholesale for one column, and the rule is identical for all four kinds, so
-- it belongs in one place.

create function public.set_content_comments_scope(
  target_type text,
  target_id uuid,
  next_scope text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare owner_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if target_type not in ('review', 'list', 'screenshot', 'diary') then
    raise exception 'invalid content type' using errcode = '22023';
  end if;
  if next_scope not in ('EVERYONE', 'FOLLOWERS', 'NOBODY') then
    raise exception 'invalid comment scope' using errcode = '22023';
  end if;

  owner_id := case target_type
    when 'review' then (select profile_id from public.reviews where id = target_id)
    when 'list' then (select profile_id from public.game_lists where id = target_id)
    when 'screenshot' then (select profile_id from public.screenshots where id = target_id)
    when 'diary' then (select profile_id from public.diary_entries where id = target_id)
  end;
  if owner_id is null then raise exception 'content not found' using errcode = 'P0002'; end if;
  if owner_id <> auth.uid() then raise exception 'not the owner' using errcode = '42501'; end if;

  if target_type = 'review' then
    update public.reviews set comments_scope = next_scope, updated_at = now()
    where id = target_id;
  elsif target_type = 'list' then
    update public.game_lists set comments_scope = next_scope, updated_at = now()
    where id = target_id;
  elsif target_type = 'screenshot' then
    update public.screenshots set comments_scope = next_scope, updated_at = now()
    where id = target_id;
  else
    update public.diary_entries set comments_scope = next_scope, updated_at = now()
    where id = target_id;
  end if;
  return next_scope;
end;
$$;

revoke all on function public.set_content_comments_scope(text,uuid,text) from public, anon;
grant execute on function public.set_content_comments_scope(text,uuid,text) to authenticated;
