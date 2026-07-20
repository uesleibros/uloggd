-- The drawer is a free-form markdown showcase on the profile, separate from
-- the plain-text bio, mirroring legacy uloggd.
alter table public.profiles
  add column if not exists drawer varchar(10000);

grant update (drawer) on public.profiles to authenticated;

create or replace function public.update_profile_drawer(new_drawer text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if new_drawer is not null and char_length(trim(new_drawer)) > 10000 then raise exception 'drawer too long' using errcode = '22023'; end if;

  update public.profiles set
    drawer = nullif(trim(coalesce(new_drawer, '')), ''),
    updated_at = now()
  where id = auth.uid() returning * into result;
  if result.id is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.update_profile_drawer(text) from public, anon;
grant execute on function public.update_profile_drawer(text) to authenticated;
