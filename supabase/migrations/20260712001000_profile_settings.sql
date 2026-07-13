alter table public.profiles
  add column if not exists pronouns varchar(30),
  add constraint profiles_pronouns_format_check check (
    pronouns is null or (char_length(trim(pronouns)) between 1 and 30 and pronouns !~ '[\r\n]')
  );

grant update (pronouns) on public.profiles to authenticated;

create or replace function public.update_profile_settings(
  new_display_name text,
  new_pronouns text,
  new_bio text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if new_display_name is not null and char_length(trim(new_display_name)) > 80 then
    raise exception 'display name too long' using errcode = '22023';
  end if;
  if new_pronouns is not null and (
    char_length(trim(new_pronouns)) > 30 or trim(new_pronouns) ~ '[\r\n]'
  ) then
    raise exception 'invalid pronouns' using errcode = '22023';
  end if;
  if new_bio is not null and char_length(trim(new_bio)) > 500 then
    raise exception 'bio too long' using errcode = '22023';
  end if;

  update public.profiles
  set
    display_name = nullif(trim(new_display_name), ''),
    pronouns = nullif(trim(new_pronouns), ''),
    bio = nullif(trim(new_bio), ''),
    updated_at = now()
  where id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

revoke all on function public.update_profile_settings(text, text, text) from public, anon;
grant execute on function public.update_profile_settings(text, text, text) to authenticated;
