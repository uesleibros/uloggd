-- Visitors cannot read profile_moderation_state (RLS limits it to the owner
-- and staff), but a suspended profile has to read as suspended to everyone,
-- the way a suspended account does on other platforms. This exposes only
-- whether the suspension is active and when it lifts, never the reason,
-- which stays internal to moderation.
create or replace function public.profile_suspension(target uuid)
returns table (suspended boolean, banned_until timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select
    true,
    state.banned_until
  from public.profile_moderation_state state
  where state.profile_id = target
    and (state.banned_until is null or state.banned_until > now())
  limit 1;
$$;

revoke all on function public.profile_suspension(uuid) from public;
grant execute on function public.profile_suspension(uuid) to anon, authenticated;
