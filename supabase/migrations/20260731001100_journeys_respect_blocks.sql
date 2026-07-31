-- Journeys start respecting blocks, like everything else a profile owns.
--
-- `journeys_read` was `using (true)`, so blocking someone hid your reviews,
-- screenshots, diary entries, comments, library and lists from them, and left
-- your journeys visible. Found by blocking one account with another and
-- checking every table a profile owns, rather than by reading this policy.
--
-- The entries inside a journey were already hidden, so what leaked was the
-- journey itself: which games someone is playing through and what they named
-- the playthrough. Small, but a block that holds everywhere except one place
-- is not a block someone can rely on, and that is the whole value of it.
--
-- Journeys carry no visibility column of their own, so the block check is the
-- whole rule here. Anonymous visitors and the owner are unaffected.
drop policy if exists journeys_read on public.journeys;

create policy journeys_read on public.journeys
  for select
  using (not public.viewer_blocked_with(profile_id));
