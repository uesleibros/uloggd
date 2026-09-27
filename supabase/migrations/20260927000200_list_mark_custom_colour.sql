-- A tenth swatch: whatever colour the author wants.
--
-- The palette is nine names, which are tokens rather than values so each
-- theme decides what red looks like on its own background. That covers most
-- lists and leaves the one case a palette cannot: somebody whose legend needs
-- a colour that is not in it.
--
-- So a mark colour is a name from the list, or a plain `#rrggbb`. A name
-- still goes through the tokens; a literal is exactly what was picked, which
-- is the trade somebody makes by picking one.

alter table public.game_list_items
  drop constraint if exists game_list_items_mark_color_check;

alter table public.game_list_items
  add constraint game_list_items_mark_color_check check (
    mark_color is null
    or mark_color in (
      'RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'BLUE', 'PURPLE',
      'PINK', 'NEUTRAL'
    )
    or mark_color ~ '^#[0-9a-f]{6}$'
  );

create or replace function public.set_list_item_mark(
  target_list uuid,
  item_id uuid,
  mode text default null,
  colour text default null
)
returns public.game_list_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.game_list_items;
  chosen text := case
    when colour is null then null
    -- A literal arrives in whatever case the colour input produced. One
    -- spelling per colour, so two identical marks are identical rows.
    when colour like '#%' then lower(colour)
    else upper(colour)
  end;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not exists(
    select 1 from public.game_lists
    where id = target_list and profile_id = auth.uid()
  ) then
    raise exception 'not the owner' using errcode = '42501';
  end if;
  if mode is not null and mode not in ('COLOR', 'DIM') then
    raise exception 'invalid mark mode' using errcode = '22023';
  end if;
  if chosen is not null
     and chosen not in (
       'RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'BLUE', 'PURPLE',
       'PINK', 'NEUTRAL'
     )
     and chosen !~ '^#[0-9a-f]{6}$' then
    raise exception 'invalid mark colour' using errcode = '22023';
  end if;

  update public.game_list_items
  set
    mark_mode = mode,
    mark_color = case when mode = 'COLOR' then chosen else null end
  where id = item_id and list_id = target_list
  returning * into result;
  if result.id is null then
    raise exception 'item not found' using errcode = 'P0002';
  end if;

  update public.game_lists set updated_at = now() where id = target_list;
  return result;
end;
$$;

revoke all on function public.set_list_item_mark(uuid, uuid, text, text) from public, anon;
grant execute on function public.set_list_item_mark(uuid, uuid, text, text) to authenticated;
