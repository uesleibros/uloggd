-- OAuth metadata is authentication context, not an editable public profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Only clean unfinished profiles when the values still match provider metadata.
update public.profiles as profile
set display_name = case
      when profile.display_name = users.raw_user_meta_data ->> 'name' then null
      else profile.display_name
    end,
    avatar_url = case
      when profile.avatar_url = users.raw_user_meta_data ->> 'avatar_url' then null
      else profile.avatar_url
    end,
    updated_at = now()
from auth.users as users
where profile.id = users.id
  and profile.username is null
  and (
    profile.display_name = users.raw_user_meta_data ->> 'name'
    or profile.avatar_url = users.raw_user_meta_data ->> 'avatar_url'
  );
