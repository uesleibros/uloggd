-- Keep each substring index aligned with a search that the application runs.
-- The activity queries separate a record's text from its journey title so
-- PostgreSQL can use these indexes independently.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create index if not exists reviews_search_trgm_idx
  on public.reviews using gin
  (game_slug gin_trgm_ops, title gin_trgm_ops, content gin_trgm_ops,
   platform gin_trgm_ops);

create index if not exists diary_entries_search_trgm_idx
  on public.diary_entries using gin
  (game_slug gin_trgm_ops, note gin_trgm_ops);

create index if not exists screenshots_search_trgm_idx
  on public.screenshots using gin
  (game_slug gin_trgm_ops, description gin_trgm_ops);

create index if not exists journeys_title_trgm_idx
  on public.journeys using gin (title gin_trgm_ops);

create index if not exists reviews_journey_idx
  on public.reviews (journey_id);

-- The copy search checks the slug, edition and platform together. Replace the
-- slug-only index so every branch can use the same GIN index.
create index if not exists library_entries_search_trgm_idx
  on public.library_entries using gin
  (game_slug gin_trgm_ops,
   lower(coalesce(edition, '')) gin_trgm_ops,
   lower(coalesce(platform_name, '')) gin_trgm_ops);

drop index if exists public.library_entries_slug_trgm_idx;
