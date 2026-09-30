# Search index audit

On 29 September 2026, the production database had about 102 profiles, 43 lists,
397 reviews, 32 screenshots, and 1,944 library game rows. The main tables
already had B-tree indexes for profile, game, and date filters. On the current
dataset, a representative substring scan took about 0.4 ms for profiles and
0.1 ms for lists. Adding an index cannot remove application or network time
from those requests.

In a temporary table with 50,000 generated profiles and six matching names,
the same substring predicate took 108.8 ms with a sequential scan and 0.09 ms
with the GIN index. This is a synthetic growth check, not a production latency
measurement. It verifies that the existing query can use the index when the
table is large enough for it to be worthwhile.

The people search uses `username ILIKE '%term%' OR display_name ILIKE '%term%'`.
List search uses `name ILIKE '%term%'`. Migration
`20260929000200_search_trigram_indexes.sql` adds one multicolumn GIN trigram
index for people and one GIN trigram index for list names. PostgreSQL can use
them for selective substring searches as these tables grow. Searches shorter
than three useful characters may still scan the table. The planner may also
prefer a sequential scan while the tables remain small.

The review and diary search filters also check a joined journey title. Testing
their old SQL against a temporary trigram index showed a sequential scan even
with `enable_seqscan = off`: the `OR` across the joined table prevented the text
index from being used. The activity query now unions matching record IDs from
the record's own text and from matching journey titles. The outer filter uses
`IN`, so a record that matches both paths appears once. Migration
`20260929000300_activity_and_copy_search_indexes.sql` adds multicolumn GIN
trigram indexes for reviews, diary entries, screenshots, and journey titles.
It also adds a B-tree index on review journey IDs for the title branch. The
existing diary journey ID index serves its branch.

Copy search checks game slug, edition, and platform name together. The old
slug-only GIN index could not cover the whole `OR`; the migration replaces it
with a GIN index on the slug and the two exact expressions used by the route.
The copy table has almost no rows today, so this is preparation for larger
personal libraries, not a claim of an immediate speedup. The frequently called
community rating query already has an index on the relevant game ID and rating
columns. Its call volume, rather than an absent index, dominates accumulated
execution time.

The new migration was executed inside a rolled-back transaction on the live
schema. With sequential scans disabled for this planner check, the review,
diary, screenshot, and copy text branches used their respective GIN indexes;
the journey branches used existing or new journey ID indexes. Comparing the
old and new review and diary predicates on current rows found no difference in
matching IDs. This proves index eligibility and current result equivalence,
not a production latency improvement on these small tables.

Watch `pg_stat_statements` mean execution time and `pg_stat_user_indexes`
usage as the tables grow. Review these indexes before adding more, because
GIN indexes add work to inserts and updates.

References: [PostgreSQL trigram indexes](https://www.postgresql.org/docs/17/pgtrgm.html),
[Supabase query optimization](https://supabase.com/docs/guides/database/query-optimization).
