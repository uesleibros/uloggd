-- A list item was "done". It should never have been.
--
-- Ticking an item greyed it out, put a check over the cover and fed a line
-- saying "8 of 9 done". That is one meaning, and a list here is any of:
-- games I want to buy, games I recommend, the best of a series, what my
-- friends picked, a challenge, a ranking, a themed shelf. On most of those,
-- "done" is a sentence the site put in somebody's mouth.
--
-- So the mark stays and the meaning goes. An item can be left alone, given a
-- colour, or dimmed, and what any of that means belongs to whoever made the
-- list: they can write "green = recommend, grey = have not played" in the
-- description, or exactly the opposite, and the site never decides.
--
-- The colours are stored as names rather than values, so the themes can keep
-- deciding what red looks like on a light background, and so a future palette
-- change does not have to rewrite anybody's rows.
--
-- What was ticked becomes DIM, because that is what it looked like: greyed
-- out. Nobody loses a mark they made, and nothing here calls it "done" again.

alter table public.game_list_items
  add column if not exists mark_mode text,
  add column if not exists mark_color text;

do $$ begin
  alter table public.game_list_items
    add constraint game_list_items_mark_mode_check check (
      mark_mode is null or mark_mode in ('COLOR', 'DIM')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.game_list_items
    add constraint game_list_items_mark_color_check check (
      mark_color is null or mark_color in (
        'RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'BLUE', 'PURPLE',
        'PINK', 'NEUTRAL'
      )
    );
exception when duplicate_object then null; end $$;

-- A colour without COLOR is a row that renders as nothing and reads as a bug.
do $$ begin
  alter table public.game_list_items
    add constraint game_list_items_mark_pair_check check (
      mark_color is null or mark_mode = 'COLOR'
    );
exception when duplicate_object then null; end $$;

update public.game_list_items
set mark_mode = 'DIM'
where marked and mark_mode is null;

alter table public.game_list_items drop column if exists marked;

/**
 * Sets how one item looks, or stops it looking like anything.
 *
 * `mode` null is "no treatment". A colour is only kept with COLOR, so
 * switching to DIM and back does not quietly restore a colour nobody chose
 * again.
 */
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
  if colour is not null and colour not in (
    'RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'BLUE', 'PURPLE',
    'PINK', 'NEUTRAL'
  ) then
    raise exception 'invalid mark colour' using errcode = '22023';
  end if;

  update public.game_list_items
  set
    mark_mode = mode,
    mark_color = case when mode = 'COLOR' then colour else null end
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

-- The old door, which only ever said "done" or "not done".
drop function if exists public.set_list_item_marked(uuid, uuid, boolean);
