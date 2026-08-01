-- Web push: the devices a person asked to be reached on, and the hook that
-- reaches them.
--
-- Notifications are written by triggers, not by application code, so there is
-- no server request to piggyback on when one is created. `pg_net` gives the
-- database a way to call the app back, and the call carries only the row id:
-- the route loads the rest with its own credentials, so a leaked endpoint
-- cannot be replayed into reading someone's activity.
--
-- Delivery preferences are already enforced upstream. A notification row only
-- exists if `notification_preference_enabled` allowed it, so anything that
-- reaches this trigger is something the recipient asked to hear about.

-- Supabase installs pg_net into its own `net` schema; naming another one here
-- is accepted and then ignored, which is how the first version of this trigger
-- ended up calling a function that does not exist.
create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- The push service's URL for this device. Unique because re-subscribing on
  -- the same browser returns the same endpoint, and a duplicate would send the
  -- same notification twice.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  -- Only to help someone recognise a device in the settings list. Truncated,
  -- since a full user agent string is a fingerprint and this does not need one.
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

-- Owner-only, in both directions. Nobody needs to know what someone else has
-- installed, and an endpoint is a capability: whoever holds one can push to
-- that device.
drop policy if exists push_subscriptions_owner_read on public.push_subscriptions;
create policy push_subscriptions_owner_read on public.push_subscriptions
  for select using ((select auth.uid()) = profile_id);
drop policy if exists push_subscriptions_owner_write on public.push_subscriptions;
create policy push_subscriptions_owner_write on public.push_subscriptions
  for insert with check ((select auth.uid()) = profile_id);
drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;
create policy push_subscriptions_owner_delete on public.push_subscriptions
  for delete using ((select auth.uid()) = profile_id);

revoke all on public.push_subscriptions from anon, authenticated;
grant select (id, profile_id, endpoint, device_label, created_at, last_used_at)
  on public.push_subscriptions to authenticated;
grant insert, delete on public.push_subscriptions to authenticated;

/**
 * Where to call, and the shared secret to prove the call is ours.
 *
 * Deliberately a table rather than values written into this migration: the
 * secret would otherwise live in git forever. Populated out of band, and the
 * trigger below is a no-op until it is, so a database without this configured
 * simply does not send push and nothing errors.
 */
create table if not exists private.push_config (
  id boolean primary key default true check (id),
  dispatch_url text not null,
  secret text not null
);
alter table private.push_config enable row level security;
revoke all on private.push_config from anon, authenticated;

create or replace function private.dispatch_push()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  config private.push_config%rowtype;
begin
  select * into config from private.push_config limit 1;
  if not found then
    return null;
  end if;

  -- Fire and forget. `pg_net` queues the request and returns immediately, so a
  -- slow or unreachable push service cannot hold open the transaction that is
  -- writing someone's like or comment.
  perform net.http_post(
    url := config.dispatch_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', config.secret
    ),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function private.dispatch_push();
