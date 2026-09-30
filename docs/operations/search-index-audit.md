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
their current SQL against a temporary trigram index showed a sequential scan
even with `enable_seqscan = off`: the `OR` across the joined table prevents the
text index from being used. No review or diary index was added without a query
rewrite. The frequently called community rating query already has an index
on the relevant game ID and rating columns. Its call volume, rather than an
absent index, dominates accumulated execution time.

Watch `pg_stat_statements` mean execution time and `pg_stat_user_indexes`
usage as the tables grow. Review these indexes before adding more, because
GIN indexes add work to inserts and updates.

References: [PostgreSQL trigram indexes](https://www.postgresql.org/docs/17/pgtrgm.html),
[Supabase query optimization](https://supabase.com/docs/guides/database/query-optimization).
