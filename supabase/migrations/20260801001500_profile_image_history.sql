-- Recent avatars and banners are kept, so switching back is one tap.
--
-- Changing a profile picture used to destroy the old one. People swap avatars
-- for a season, a joke or a mood and want the previous one back, and today that
-- means having kept the file themselves.
--
-- Five slots per kind, oldest evicted, which is enough to cover "the one before
-- this" and "the one I actually like" without becoming an archive nobody
-- curates. Anyone can drop a slot they would rather not keep.
--
-- The images already live on imgchest and are not deleted when swapped out of
-- the profile, so this records URLs rather than copying anything.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ProfileImageKind') then
    create type public."ProfileImageKind" as enum ('AVATAR', 'BANNER');
  end if;
end
$$;

create table if not exists public.profile_image_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public."ProfileImageKind" not null,
  image_url text not null,
  -- Kept so removing a slot can also remove the file, and so an image that was
  -- never uploaded through us is recognisable by its absence.
  remote_id text,
  -- `clock_timestamp()` rather than `now()`: the latter returns the start of
  -- the transaction, so several changes inside one transaction all land on the
  -- same instant and the ordering that decides which slot is evicted becomes
  -- arbitrary. Found by writing seven images in one test and getting the five
  -- oldest back.
  created_at timestamptz not null default clock_timestamp(),
  -- The same picture used twice is one slot, not two: re-selecting an old
  -- avatar should not push a duplicate in and evict something else.
  unique (profile_id, kind, image_url)
);

create index if not exists profile_image_history_lookup_idx
  on public.profile_image_history (profile_id, kind, created_at desc);

alter table public.profile_image_history enable row level security;

-- Owner-only in every direction. These are pictures someone chose to stop
-- showing, and a list of them is a record of how they have presented
-- themselves over time: public on the profile, private as a history.
drop policy if exists profile_image_history_owner_read on public.profile_image_history;
create policy profile_image_history_owner_read on public.profile_image_history
  for select using ((select auth.uid()) = profile_id);
drop policy if exists profile_image_history_owner_delete on public.profile_image_history;
create policy profile_image_history_owner_delete on public.profile_image_history
  for delete using ((select auth.uid()) = profile_id);

revoke all on public.profile_image_history from anon, authenticated;
-- `profile_id` is included because filtering by a column requires SELECT on
-- it, even when row-level security already scopes the rows to their owner.
grant select (id, profile_id, kind, image_url, remote_id, created_at)
  on public.profile_image_history to authenticated;
grant delete on public.profile_image_history to authenticated;

/** How many are kept per kind. */
create or replace function public.profile_image_history_limit()
returns integer language sql immutable set search_path = '' as $$ select 5 $$;

/**
 * Records an image in the caller's history and evicts the oldest beyond the
 * limit.
 *
 * A definer function rather than an insert policy, because the eviction has to
 * happen in the same statement as the insert: two round trips would let a
 * refresh between them leave six slots, and the client cannot be trusted to
 * make the second call at all.
 */
create or replace function public.remember_profile_image(
  image_kind text,
  url text,
  remote text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare resolved public."ProfileImageKind";
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if image_kind not in ('AVATAR', 'BANNER') then
    raise exception 'invalid image kind' using errcode = '22023';
  end if;
  if url is null or btrim(url) = '' then return; end if;
  resolved := image_kind::public."ProfileImageKind";

  insert into public.profile_image_history (profile_id, kind, image_url, remote_id)
  values (auth.uid(), resolved, btrim(url), remote)
  -- Re-selecting an old picture moves it back to the front rather than being
  -- refused, so the list stays ordered by "when I last used this".
  on conflict (profile_id, kind, image_url)
    do update set created_at = clock_timestamp();

  delete from public.profile_image_history
   where id in (
     select id from public.profile_image_history
      where profile_id = auth.uid() and kind = resolved
      order by created_at desc
      offset public.profile_image_history_limit()
   );
end;
$$;

revoke all on function public.remember_profile_image(text, text, text) from public, anon;
grant execute on function public.remember_profile_image(text, text, text) to authenticated;
