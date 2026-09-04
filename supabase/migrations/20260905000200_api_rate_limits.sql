-- A ceiling per key, counted apart from the account's own.
--
-- private.claim_rate_limit keys on auth.uid(), and an API request runs as the
-- key's owner, so reusing it would let one noisy integration spend the
-- allowance its owner needs to use the website and lock them out of their own
-- account. The key is what is noisy, so the key is what is counted.
--
-- Returns the state instead of raising, unlike the trigger limiter: every
-- response carries X-RateLimit-Remaining and X-RateLimit-Reset, including the
-- ones that are allowed, so the caller has to be told the numbers rather than
-- only stopped at the wall.

create table if not exists private.api_rate_events (
  id bigserial primary key,
  key_id uuid not null,
  bucket text not null,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists api_rate_events_window_idx
  on private.api_rate_events (key_id, bucket, created_at desc);

revoke all on private.api_rate_events from public, anon, authenticated;

/**
 * Counts one call against a key's bucket and reports what is left.
 *
 * `clock_timestamp()`, never `now()`: now() is the start of the transaction,
 * and a window measured from one while its rows are stamped with the other
 * reports a reset that never arrives.
 */
create or replace function public.claim_api_rate_limit(
  key_ref uuid,
  bucket_name text,
  allowance integer,
  window_size interval
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  used integer;
  oldest timestamptz;
begin
  -- Held for the rest of the transaction so two requests racing each other
  -- cannot both read one short of the ceiling and both write.
  perform 1 from public.api_keys where id = key_ref for update;

  delete from private.api_rate_events e
   where e.key_id = key_ref
     and e.bucket = bucket_name
     and e.created_at <= clock_timestamp() - window_size;

  select count(*), min(e.created_at) into used, oldest
    from private.api_rate_events e
   where e.key_id = key_ref and e.bucket = bucket_name;

  if used >= allowance then
    return query select false, 0, oldest + window_size;
    return;
  end if;

  insert into private.api_rate_events (key_id, bucket)
  values (key_ref, bucket_name);

  return query select
    true,
    allowance - used - 1,
    coalesce(oldest, clock_timestamp()) + window_size;
end;
$$;

revoke all on function public.claim_api_rate_limit(uuid, text, integer, interval)
  from public, anon, authenticated;
grant execute on function public.claim_api_rate_limit(uuid, text, integer, interval)
  to service_role;
