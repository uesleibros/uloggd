-- Adds an explicit distinction between a "collection" (unordered set of games)
-- and a "ranking" (ordered top-N). Before this the item grid always painted a
-- numbered index badge, so every list looked like a ranking regardless of the
-- author's intent. Existing lists default to collections; the author opts into
-- ranking mode when it actually reflects their intent.

alter table public.game_lists
  add column if not exists ranked boolean not null default false;

-- create_game_list gains list_ranked. The default keeps existing named-arg
-- callers working while the new UI toggle wires the flag through explicitly.
drop function if exists public.create_game_list(text, text, public."Visibility");
create or replace function public.create_game_list(
  list_name text,
  list_description text default null,
  list_visibility public."Visibility" default 'PUBLIC',
  list_ranked boolean default false
)
returns public.game_lists
language plpgsql security definer set search_path = ''
as $$
declare result public.game_lists;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(list_name)) not between 1 and 100 then raise exception 'invalid name' using errcode = '22023'; end if;
  if char_length(trim(coalesce(list_description, ''))) > 500 then raise exception 'description too long' using errcode = '22023'; end if;
  insert into public.game_lists(profile_id, name, description, visibility, ranked)
  values(auth.uid(), trim(list_name), nullif(trim(list_description), ''), list_visibility, coalesce(list_ranked, false))
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_game_list(text, text, public."Visibility", boolean) from public, anon;
grant execute on function public.create_game_list(text, text, public."Visibility", boolean) to authenticated;

drop function if exists public.update_game_list(uuid, text, text, public."Visibility");
create or replace function public.update_game_list(
  target_list uuid,
  list_name text,
  list_description text default null,
  list_visibility public."Visibility" default 'PUBLIC',
  list_ranked boolean default null
)
returns public.game_lists
language plpgsql security definer set search_path = ''
as $$
declare result public.game_lists;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(trim(list_name)) not between 1 and 100 then raise exception 'invalid name' using errcode = '22023'; end if;
  if char_length(trim(coalesce(list_description, ''))) > 500 then raise exception 'description too long' using errcode = '22023'; end if;
  update public.game_lists set
    name = trim(list_name),
    description = nullif(trim(list_description), ''),
    visibility = list_visibility,
    ranked = coalesce(list_ranked, ranked),
    updated_at = now()
  where id = target_list and profile_id = auth.uid()
  returning * into result;
  if result.id is null then raise exception 'list not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;
revoke all on function public.update_game_list(uuid, text, text, public."Visibility", boolean) from public, anon;
grant execute on function public.update_game_list(uuid, text, text, public."Visibility", boolean) to authenticated;
