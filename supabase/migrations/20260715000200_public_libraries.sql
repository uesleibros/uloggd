alter table public.profiles
  add column if not exists library_visibility public."Visibility" not null default 'PUBLIC';

grant select on public.user_games to anon;

create policy "user_games_visible_read"
  on public.user_games for select to anon, authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.profiles
      where profiles.id = user_games.profile_id
        and profiles.library_visibility = 'PUBLIC'
    )
  );

create or replace function public.set_library_visibility(new_visibility public."Visibility")
returns public."Visibility"
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if new_visibility not in ('PUBLIC', 'PRIVATE') then
    raise exception 'invalid library visibility' using errcode = '22023';
  end if;
  update public.profiles
  set library_visibility = new_visibility, updated_at = now()
  where id = auth.uid();
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return new_visibility;
end;
$$;

revoke all on function public.set_library_visibility(public."Visibility") from public, anon;
grant execute on function public.set_library_visibility(public."Visibility") to authenticated;
