-- A game in a list can be ticked off.
--
-- The list itself is the plan ("games to finish in 2026") and the tick is the
-- progress through it: a marked game is drawn faded with a check, so a list
-- says at a glance how much of it is done. The mark belongs to the list, not
-- to the account's library: the same game can be ticked in one list and not in
-- another, and a list of somebody else's making is never ticked by a reader.

alter table public.game_list_items
  add column if not exists marked boolean not null default false;

-- Only the owner of the list, with the same shape as the other item writes.
create or replace function public.set_list_item_marked(
  target_list uuid,
  item_id uuid,
  is_marked boolean
)
returns public.game_list_items
language plpgsql security definer set search_path = ''
as $$
declare result public.game_list_items;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists(select 1 from public.game_lists where id = target_list and profile_id = auth.uid()) then
    raise exception 'list not found' using errcode = '42501';
  end if;
  update public.game_list_items set marked = coalesce(is_marked, false)
  where id = item_id and list_id = target_list returning * into result;
  if result.id is null then raise exception 'item not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.set_list_item_marked(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_list_item_marked(uuid, uuid, boolean) to authenticated;
