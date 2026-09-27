-- Browsing a shelf, rather than reading all of it.
--
-- The copies view asked for every row a person had and filtered them in the
-- browser. That is fine for twenty and wrong as an architecture: somebody
-- with two thousand copies should not have two thousand rows sent to them to
-- draw twenty-four.
--
-- So the reads become a page at a time, ordered, filtered and counted in the
-- database. One index for the order every page is taken in; the filters and
-- the facet counts run over one person's rows, which is a small set behind
-- `profile_id`, so they need nothing of their own.
--
-- `game_slug` carries the title: it is the name lowercased with dashes, which
-- is what makes searching and ordering by title possible without asking the
-- catalogue about every row. The trigram index makes the search a lookup
-- rather than a scan once a shelf gets big.

create index if not exists library_entries_profile_recent_idx
  on public.library_entries (profile_id, created_at desc, id desc);

create extension if not exists pg_trgm;

create index if not exists library_entries_slug_trgm_idx
  on public.library_entries using gin (game_slug gin_trgm_ops);
