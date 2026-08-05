-- A ceiling on how fast one account can act on other people.
--
-- Changing a picture already had one, and for the same reason: nothing stopped
-- an account doing a thing as fast as it could send requests. The difference
-- is who pays. A flickering avatar is annoying; a comment, a follow and a like
-- each ring somebody else's bell, so the unlimited version is a harassment
-- tool that needs no account older than a minute to use.
--
-- Enforced with triggers rather than by editing the six functions that write
-- these rows. Rewriting a function body to add one line means restating the
-- whole body, and the whole body is where the bugs would be; a trigger also
-- covers any path that writes the table later, including ones that do not
-- exist yet.

create schema if not exists private;

create table if not exists private.rate_events (
  id bigserial primary key,
  profile_id uuid not null,
  action text not null,
  created_at timestamptz not null default clock_timestamp()
);

-- The only query this table serves: how many of one action, by one account,
-- inside one window.
create index if not exists rate_events_window_idx
  on private.rate_events (profile_id, action, created_at desc);

-- Nothing outside the database touches this. It exists to be counted by the
-- function below, and an account that could delete its own rows could lift its
-- own limit.
revoke all on private.rate_events from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;

/**
 * Records one action, or refuses it when the window is full.
 *
 * Raises rather than returning a number, unlike the picture limiter: that one
 * is called straight from the browser and its caller needs to say "try again
 * in four minutes", while this runs inside somebody else's insert and its job
 * is to stop the write. The wait still travels in the message so the interface
 * can show it.
 *
 * `clock_timestamp()`, never `now()`. `now()` is the start of the transaction,
 * and comparing rows stamped with one against a window measured from the other
 * made a ten minute limit report an eleven minute wait the last time this
 * mistake was made here.
 */
create or replace function private.claim_rate_limit(
  action_name text,
  allowance integer,
  window_size interval
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  used integer;
  oldest timestamptz;
  wait_seconds integer;
begin
  -- No session means no actor to limit. Everything that reaches here is
  -- already behind row level security, which is what decides whether the write
  -- is allowed at all.
  if caller is null then return; end if;

  -- Held for the rest of the transaction so two requests racing each other
  -- cannot both read one short of the ceiling and both write.
  perform 1 from public.profiles where id = caller for update;

  -- Rows outside the window are of no further use to anyone, and dropping them
  -- here is what keeps the table bounded without a scheduled job.
  delete from private.rate_events
   where profile_id = caller
     and action = action_name
     and created_at <= clock_timestamp() - window_size;

  select count(*), min(created_at) into used, oldest
    from private.rate_events
   where profile_id = caller and action = action_name;

  if used >= allowance then
    wait_seconds := greatest(
      1,
      ceil(
        extract(epoch from (oldest + window_size - clock_timestamp()))
      )::integer
    );
    raise exception 'rate limit: % in %s', action_name, wait_seconds
      using errcode = '53400',
            hint = wait_seconds::text;
  end if;

  insert into private.rate_events (profile_id, action)
  values (caller, action_name);
end;
$$;

revoke all on function private.claim_rate_limit(text, integer, interval)
  from public, anon, authenticated;

/**
 * The allowances.
 *
 * Set high enough that nobody using the site normally will ever see one, and
 * low enough that a script stops being useful. Somebody replying quickly in a
 * thread writes a handful of comments a minute; fifteen in five minutes leaves
 * room for that and none for a flood.
 */
create or replace function private.rate_limit_comment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.claim_rate_limit('comment', 15, interval '5 minutes');
  return new;
end;
$$;

create or replace function private.rate_limit_follow()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Counts the follow, not the unfollow: the notification fires on the way in,
  -- so a follow and unfollow loop is what this is for.
  perform private.claim_rate_limit('follow', 30, interval '5 minutes');
  return new;
end;
$$;

create or replace function private.rate_limit_like()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.claim_rate_limit('like', 60, interval '5 minutes');
  return new;
end;
$$;

create or replace function private.rate_limit_list()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Hourly rather than by the minute: making lists is deliberate work, and
  -- nobody makes ten in an hour by hand.
  perform private.claim_rate_limit('list', 10, interval '1 hour');
  return new;
end;
$$;

drop trigger if exists rate_limit_content_comments on public.content_comments;
create trigger rate_limit_content_comments
  before insert on public.content_comments
  for each row execute function private.rate_limit_comment();

-- No trigger on `profile_comments`. `create_profile_comment` already carries
-- its own ceiling, five a minute plus a daily total, and it is stricter than
-- this one: a second limit on the same table would only be a second number to
-- keep in sync. `content_comments`, on reviews and lists and screenshots, had
-- none, which is the gap this closes.

drop trigger if exists rate_limit_follows on public.follows;
create trigger rate_limit_follows
  before insert on public.follows
  for each row execute function private.rate_limit_follow();

drop trigger if exists rate_limit_follow_requests on public.follow_requests;
create trigger rate_limit_follow_requests
  before insert on public.follow_requests
  for each row execute function private.rate_limit_follow();

drop trigger if exists rate_limit_content_likes on public.content_likes;
create trigger rate_limit_content_likes
  before insert on public.content_likes
  for each row execute function private.rate_limit_like();

drop trigger if exists rate_limit_game_lists on public.game_lists;
create trigger rate_limit_game_lists
  before insert on public.game_lists
  for each row execute function private.rate_limit_list();
