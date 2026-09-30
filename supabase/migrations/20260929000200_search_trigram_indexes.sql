-- The search endpoints use contains matches, such as ILIKE '%name%'.
-- B-tree indexes on usernames and list owners cannot answer those patterns.
-- Keep the new indexes limited to searches whose current SQL can use them.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create extension if not exists pg_trgm;

create index if not exists profiles_search_trgm_idx
  on public.profiles using gin
  (username gin_trgm_ops, display_name gin_trgm_ops)
  where username is not null;

create index if not exists game_lists_name_trgm_idx
  on public.game_lists using gin (name gin_trgm_ops);
