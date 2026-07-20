-- Markdown bios need more room than the old plain-text limit.
alter table public.profiles
  alter column bio type varchar(2000);

create or replace function public.update_profile_settings(
  new_display_name text,
  new_pronouns text,
  new_bio text,
  new_youtube_username text default null,
  new_instagram_username text default null,
  new_twitter_username text default null,
  new_thought text default null
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
  if new_bio is not null and char_length(trim(new_bio)) > 2000 then raise exception 'bio too long' using errcode = '22023'; end if;
  if new_thought is not null and (char_length(trim(new_thought)) > 100 or trim(new_thought) ~ '[\r\n]') then raise exception 'invalid thought' using errcode = '22023'; end if;
  if nullif(trim(leading '@' from coalesce(new_youtube_username, '')), '') is not null and trim(leading '@' from new_youtube_username) !~ '^[A-Za-z0-9._-]{1,100}$' then raise exception 'invalid youtube username' using errcode = '22023'; end if;
  if nullif(trim(leading '@' from coalesce(new_instagram_username, '')), '') is not null and trim(leading '@' from new_instagram_username) !~ '^[A-Za-z0-9._]{1,30}$' then raise exception 'invalid instagram username' using errcode = '22023'; end if;
  if nullif(trim(leading '@' from coalesce(new_twitter_username, '')), '') is not null and trim(leading '@' from new_twitter_username) !~ '^[A-Za-z0-9_]{1,15}$' then raise exception 'invalid twitter username' using errcode = '22023'; end if;

  update public.profiles set
    display_name = nullif(trim(new_display_name), ''),
    pronouns = nullif(trim(new_pronouns), ''),
    bio = nullif(trim(new_bio), ''),
    thought = nullif(trim(new_thought), ''),
    youtube_username = nullif(trim(leading '@' from coalesce(new_youtube_username, '')), ''),
    instagram_username = nullif(trim(leading '@' from coalesce(new_instagram_username, '')), ''),
    twitter_username = nullif(trim(leading '@' from coalesce(new_twitter_username, '')), ''),
    updated_at = now()
  where id = auth.uid() returning * into result;
  if result.id is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.update_profile_settings(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_profile_settings(text, text, text, text, text, text, text) to authenticated;
