-- Arbitrary-position drop for list drag reordering. `new_position` is the
-- item's final index in the resulting order (0-based); a fractional sort key
-- slots it among the other items before positions are rewritten.

create function public.place_list_item(target_list uuid, item_id uuid, new_position integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare item_count integer;
declare target_index numeric;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists(select 1 from public.game_lists where id = target_list and profile_id = auth.uid()) then
    raise exception 'list not found' using errcode = '42501';
  end if;
  if not exists(select 1 from public.game_list_items where id = item_id and list_id = target_list) then
    raise exception 'item not found' using errcode = 'P0002';
  end if;

  select count(*) into item_count from public.game_list_items where list_id = target_list;
  target_index := greatest(0, least(new_position, item_count - 1)) - 0.5;

  with others as (
    select item.id, (row_number() over (order by item.position, item.created_at) - 1)::numeric as sort_key
    from public.game_list_items item
    where item.list_id = target_list and item.id <> item_id
  ),
  keyed as (
    select id, sort_key from others
    union all
    select item_id, target_index
  ),
  ranked as (
    select id, row_number() over (order by sort_key) - 1 as final_position from keyed
  )
  update public.game_list_items item set position = ranked.final_position
  from ranked
  where item.id = ranked.id and item.position <> ranked.final_position;

  return true;
end;
$$;

revoke all on function public.place_list_item(uuid,uuid,integer) from public, anon;
grant execute on function public.place_list_item(uuid,uuid,integer) to authenticated;
