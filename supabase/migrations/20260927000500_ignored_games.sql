-- Games somebody is never going to play, and does not want counted.
--
-- A series progress bar says "7 of 30". Some of those thirty are a Japan-only
-- Satellaview broadcast from 1997 that no longer exists, a phone game whose
-- servers closed, or simply one somebody has no interest in. Counting those
-- against a person for ever makes the number a lie in the direction that
-- feels worst: it says you are behind on something you cannot get to.
--
-- So a game can be ignored. It leaves the denominator, stays visible in the
-- row, and says why it is not counted. This is not "dropped", which is about
-- a game somebody played and stopped, and it is not "wishlist" upside down:
-- it is "this one is not mine to play".
--
-- Its own table rather than a flag on `user_games`, because ignoring is not
-- having: a row in the library means a game somebody keeps, and half the
-- games this is for are ones they never will.

create table if not exists public.ignored_games (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  igdb_id integer not null,
  game_slug text not null,
  -- Why, in their own words, and optional. "Lost media" and "never released
  -- here" are the two everybody writes; the site does not offer a list of
  -- reasons because it would be wrong about the third.
  note text,
  created_at timestamptz not null default now(),
  primary key (profile_id, igdb_id),
  constraint ignored_games_note_length check (note is null or char_length(note) <= 140)
);

alter table public.ignored_games enable row level security;

-- Nobody else's business, in either direction.
--
-- A progress bar is drawn for the person reading it out of their own library,
-- so nothing here is ever read on somebody else's behalf, and "games I refuse
-- to play" is not a list anybody is owed.
drop policy if exists "ignored_games_own_read" on public.ignored_games;
create policy "ignored_games_own_read" on public.ignored_games
  for select to authenticated using ((select auth.uid()) = profile_id);

drop policy if exists "ignored_games_own_insert" on public.ignored_games;
create policy "ignored_games_own_insert" on public.ignored_games
  for insert to authenticated with check ((select auth.uid()) = profile_id);

drop policy if exists "ignored_games_own_update" on public.ignored_games;
create policy "ignored_games_own_update" on public.ignored_games
  for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "ignored_games_own_delete" on public.ignored_games;
create policy "ignored_games_own_delete" on public.ignored_games
  for delete to authenticated using ((select auth.uid()) = profile_id);
