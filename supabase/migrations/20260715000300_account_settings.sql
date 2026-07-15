alter table public.profiles
  add column if not exists youtube_username varchar(100),
  add column if not exists instagram_username varchar(30),
  add column if not exists twitter_username varchar(15);

alter table public.profiles
  add constraint profiles_youtube_username_check check (youtube_username is null or youtube_username ~ '^[A-Za-z0-9._-]{1,100}$'),
  add constraint profiles_instagram_username_check check (instagram_username is null or instagram_username ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint profiles_twitter_username_check check (twitter_username is null or twitter_username ~ '^[A-Za-z0-9_]{1,15}$');

grant update (youtube_username, instagram_username, twitter_username) on public.profiles to authenticated;

create table public.profile_infractions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason varchar(160) not null,
  details varchar(1000),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index profile_infractions_profile_id_created_at_idx on public.profile_infractions(profile_id, created_at desc);
alter table public.profile_infractions enable row level security;
grant select on public.profile_infractions to authenticated;
grant all privileges on public.profile_infractions to service_role;
create policy "profile_infractions_owner_read" on public.profile_infractions
  for select to authenticated using ((select auth.uid()) = profile_id);

drop function if exists public.update_profile_settings(text, text, text);
create or replace function public.update_profile_settings(
  new_display_name text,
  new_pronouns text,
  new_bio text,
  new_youtube_username text default null,
  new_instagram_username text default null,
  new_twitter_username text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if new_display_name is not null and char_length(trim(new_display_name)) > 80 then raise exception 'display name too long' using errcode = '22023'; end if;
  if new_pronouns is not null and (char_length(trim(new_pronouns)) > 30 or trim(new_pronouns) ~ '[\r\n]') then raise exception 'invalid pronouns' using errcode = '22023'; end if;
  if new_bio is not null and char_length(trim(new_bio)) > 500 then raise exception 'bio too long' using errcode = '22023'; end if;
  if nullif(trim(leading '@' from coalesce(new_youtube_username, '')), '') is not null and trim(leading '@' from new_youtube_username) !~ '^[A-Za-z0-9._-]{1,100}$' then raise exception 'invalid youtube username' using errcode = '22023'; end if;
  if nullif(trim(leading '@' from coalesce(new_instagram_username, '')), '') is not null and trim(leading '@' from new_instagram_username) !~ '^[A-Za-z0-9._]{1,30}$' then raise exception 'invalid instagram username' using errcode = '22023'; end if;
  if nullif(trim(leading '@' from coalesce(new_twitter_username, '')), '') is not null and trim(leading '@' from new_twitter_username) !~ '^[A-Za-z0-9_]{1,15}$' then raise exception 'invalid twitter username' using errcode = '22023'; end if;

  update public.profiles set
    display_name = nullif(trim(new_display_name), ''),
    pronouns = nullif(trim(new_pronouns), ''),
    bio = nullif(trim(new_bio), ''),
    youtube_username = nullif(trim(leading '@' from coalesce(new_youtube_username, '')), ''),
    instagram_username = nullif(trim(leading '@' from coalesce(new_instagram_username, '')), ''),
    twitter_username = nullif(trim(leading '@' from coalesce(new_twitter_username, '')), ''),
    updated_at = now()
  where id = auth.uid() returning * into result;
  if result.id is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.update_profile_settings(text, text, text, text, text, text) from public, anon;
grant execute on function public.update_profile_settings(text, text, text, text, text, text) to authenticated;
