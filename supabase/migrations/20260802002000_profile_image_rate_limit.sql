-- A cooldown on changing your picture.
--
-- Nothing stopped an account cycling its avatar as fast as it could upload,
-- and an avatar is drawn beside every comment that account has ever written.
-- Flipping it repeatedly is a way to make a whole thread flicker for everyone
-- reading it, and it costs the image host a file per change. Discord has the
-- same limit for the same reason.
--
-- Counted from its own log rather than from `profile_image_history`. That
-- table keeps five slots per kind and evicts the rest, and re-selecting an
-- older picture updates a row instead of inserting one, so it can neither
-- count past five nor see a change that reuses an old image: exactly the two
-- things a limit has to notice.

create table if not exists public.profile_image_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public."ProfileImageKind" not null,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists profile_image_changes_window_idx
  on public.profile_image_changes (profile_id, created_at desc);

alter table public.profile_image_changes enable row level security;

-- Nobody reads or writes this from the API. It exists to be counted by the
-- definer function below, and an account that could delete its own rows could
-- lift its own limit.
revoke all on public.profile_image_changes from anon, authenticated;

/** How many changes are allowed, and over what window. */
create or replace function public.profile_image_change_limit()
returns integer language sql immutable set search_path = '' as $$ select 5 $$;

create or replace function public.profile_image_change_window()
returns interval language sql immutable set search_path = ''
as $$ select interval '10 minutes' $$;

/**
 * Records a picture change, or refuses it when the window is full.
 *
 * Returns the seconds left rather than raising when it refuses, so the
 * interface can say "try again in four minutes" instead of "that failed". A
 * limit somebody cannot see the end of reads as the feature being broken.
 *
 * Counted and written in one statement so two uploads racing each other cannot
 * both find room; the row lands before the caller is told it may proceed.
 */
create or replace function public.claim_profile_image_change(image_kind text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  resolved public."ProfileImageKind";
  oldest timestamptz;
  used integer;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if image_kind not in ('AVATAR', 'BANNER') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  resolved := image_kind::public."ProfileImageKind";

  -- Locked for the duration so two uploads cannot both read four and both
  -- write a fifth.
  perform 1 from public.profiles where id = caller for update;

  -- The window covers both kinds together. Someone alternating avatar and
  -- banner is doing the same thing to the same readers, and two separate
  -- allowances would simply double the ceiling.
  -- `clock_timestamp()`, not `now()`. Rows are stamped with the wall clock,
  -- and `now()` is the start of the transaction: comparing one against the
  -- other made the remaining wait come out longer than the window itself for
  -- anything measured inside a single transaction.
  select count(*), min(created_at) into used, oldest
    from public.profile_image_changes
   where profile_id = caller
     and created_at > clock_timestamp() - public.profile_image_change_window();

  if used >= public.profile_image_change_limit() then
    return greatest(
      1,
      ceil(
        extract(
          epoch
          from (
            oldest + public.profile_image_change_window() - clock_timestamp()
          )
        )
      )::integer
    );
  end if;

  insert into public.profile_image_changes (profile_id, kind)
  values (caller, resolved);
  return 0;
end;
$$;

revoke all on function public.claim_profile_image_change(text) from public, anon;
grant execute on function public.claim_profile_image_change(text) to authenticated;
