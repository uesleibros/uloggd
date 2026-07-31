-- The private library setting starts being enforced by the database.
--
-- `user_games` carries two select policies. `user_games_visible_read` is the
-- correct one and checks `library_visibility`, honours blocks, and lets owners
-- see their own rows. `user_games_public_read` is `using (true)`.
--
-- Permissive policies combine with OR, so the blanket one grants everything and
-- the careful one has never decided anything. Someone wrote the right policy
-- and left the old one in place, which is the same shape as the profiles leak:
-- a privacy promise the interface makes and the API does not keep.
--
-- The library page does check the setting before rendering, so the site
-- behaved correctly. Anyone querying the API directly read the whole library of
-- an account that had marked it private.
drop policy if exists user_games_public_read on public.user_games;

-- Verified against every case before shipping, as anon and as a signed-in
-- caller: a PUBLIC library stays readable by strangers and by anonymous
-- visitors, a PRIVATE one is readable by its owner and by nobody else.
