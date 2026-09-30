-- Only the server routes may create rows for user-uploaded images. A client
-- can skip a browser check, so row policies alone cannot enforce screening.
revoke insert on public.screenshots from authenticated;
revoke insert on public.diary_entry_images from authenticated;
revoke update on public.diary_entry_images from authenticated;

-- Earlier migrations granted INSERT on individual screenshot columns too.
-- Remove those grants as well; a table-level revoke does not override them.
do $$
declare
  columns_to_revoke text;
begin
  select string_agg(format('%I', attname), ', ')
    into columns_to_revoke
    from pg_attribute
   where attrelid = 'public.screenshots'::regclass
     and attnum > 0
     and not attisdropped;
  execute format(
    'revoke insert (%s) on public.screenshots from authenticated',
    columns_to_revoke
  );
end;
$$;
