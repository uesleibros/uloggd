# IGDB rate limits and series loading

## Production defect confirmed on 2 October 2026

The production log contained repeated `IGDB is rate limited right now` errors
from series readers and game pages. The preceding per-worker catalogue memo
reduced repeat queries inside one worker but could not survive worker replacement
or share answers across the three production workers.

The limiter also misidentified workers. It checked `process.env.NODE_UNIQUE_ID`,
but Node deletes that variable before executing the application. A real cluster
probe on Node 24.19.0 reported `isWorker: true`, `uniqueIdPresent: false` and a
connected IPC channel. Each worker therefore took the standalone budget.
Three workers could spend three separate four-request budgets on one client id.
The same bootstrap deletion exists in
[Node 22's source](https://raw.githubusercontent.com/nodejs/node/v22.x/lib/internal/process/pre_execution.js).

## Implementation

- Workers use `cluster.isWorker` and acquire live leases from the primary.
  Every runtime in one process shares the same client. IPC failure refuses
  new upstream work rather than creating another independent budget.
- The primary grants at most four starts per 1,100 ms and eight open requests,
  within [IGDB's published limits](https://api-docs.igdb.com/#rate-limits).
  Grants received more than 50 ms late are released and reacquired. A 429 pauses
  already queued requests too. Fetch completion releases its lease in `finally`;
  disconnected workers retain active leases until timeout or exit.
- Independent multiquery groups overlap network latency with at most four
  readers. Each request contains at most ten queries. The primary still owns
  the deployment's rate and concurrency ceilings. Pagination and ordering are
  preserved; failed groups stop new work and wait for open readers to finish.
- `private.igdb_catalog_cache` persists public raw responses, per-game series
  assignments and complete series memberships, including editions. Atomic,
  expiring database leases share cold work across workers. Late writers cannot
  replace a newer answer. Incomplete batches never persist a successful prefix.
- Series catalogues remain fresh for 12 hours. Complete previous answers can be
  served immediately for an additional 24 hours, with refresh scheduled through
  Next's `after`. Retry cooldown is 30 seconds and does not renew the timestamp
  of an old answer. A genuinely cold unavailable catalogue remains an explicit
  error. Raw queries keep their existing individual freshness periods.
- Memory is bounded to 24 MiB and 20,000 entries per process. Persistent storage
  is pruned to 256 MiB and 20,000 entries, with an 8 MiB limit per entry and
  seven-day retention for unused entries. Next's unbounded disk cache remains
  disabled. The former memory-only series cache and scheduled-slot limiter
  have been removed.
- This cache contains public catalogue data only. User holdings, playing states,
  ignored ids and progress are still read freshly under the caller's identity.
  Browser database roles cannot read or write the cache table. The private-data
  architecture guard separately checks the public catalogue boundary.

Migration `20261002000100_shared_igdb_catalog.sql` was the only pending migration
and was applied before deployment.

## Measurements and reproducible checks

With explicit operator authorization, the catalogue used by existing libraries
was warmed without sending identities or progress to IGDB:

| Measurement                                     |                          Result |
| ----------------------------------------------- | ------------------------------: |
| Distinct library games                          |                           1,170 |
| Complete series catalogues                      |                             341 |
| Main game memberships                           |                           5,220 |
| First fill, before concurrent-group improvement | 42 upstream requests, 77,352 ms |
| Entire catalogue in a new process after warming |   0 upstream requests, 1,043 ms |

The cold fill and persisted read measure different states. They are not an
end-to-end page speed comparison. Newly requested uncached catalogue data still
depends on upstream latency and the global rate limit; existing entries survive
deploys and worker recycling. The 341-series measurement reads the whole public
catalogue used by the site, rather than one user's visible page.

Run the repeatable warmup with backend credentials available:

```sh
node --require ./scripts/catalog-runtime.cjs --conditions=react-server --import tsx scripts/warm-series-catalog.ts
```

The warmup reads aggregate game ids from libraries, sends only those ids to IGDB,
waits for fresh complete catalogues and prints counts, elapsed time and upstream
request count. It requires authorization to send that aggregate usage information.
`scripts/catalog-runtime.cjs` gives plain Node the same `server-only` marker
resolution as Next's server build.

Measure the actual authenticated endpoint with a disposable private account:

```sh
npx tsx scripts/benchmark-series.ts http://localhost:3100
```

The benchmark uses 100 games from the public catalogue, creates its own library
and API key, requests the full series endpoint six times and removes the account.
It never prints the credential. Its timings include authentication, private
holdings reads and complete series progress calculation.

Three real Node workers were tested using the production gate and client modules.
Twelve delayed requests stayed within four starts in every rolling second and
reached, but did not exceed, eight open requests. Additional tests cover queued
429 holds, late IPC grants, disconnected workers and bounded queue deadlines.
Separate PostgreSQL connections proved one upstream load for overlapping cache
reads, reuse by a replacement reader, browser-role denial, stale timestamp
preservation and refusal of expired writers.

## Authenticated endpoint and compiled worker check

A local production standalone server was started with three real workers and
fixture mode disabled. A disposable private account with 100 real catalogue
entries produced 47 series and a 56,126-byte response. Six complete HTTP reads,
including authentication and private holdings reads, took **1,074, 393, 485, 403,
412 and 397 ms**. The test account and its API key were removed; a database
check confirmed no remaining benchmark account.

An IPC observer recorded requests from all three compiled application workers
at the primary. Each worker reported `isWorker: true` with `NODE_UNIQUE_ID`
absent. Four distinct uncached public catalogue probes returned HTTP 200 and
were the only four IGDB leases observed during the benchmark run. The library
reads reused their persisted public catalogues without requesting IGDB leases.

## Validation

- Typecheck, complete ESLint run and unit suite passed: 384 passed, zero failed,
  one skipped because the private operator NSFW fixture is absent.
- PostgreSQL cache tests: four passed against the real database, with test keys
  removed afterwards.
- Production-build browser specs ran separately, with port 3100 cleared and one
  worker: `series-workspace` 22 passed and `library-series` 12 passed, on desktop
  and mobile. An initial mobile failure matched both the visible back button and
  hidden streamed markup; the selector now checks the visible control. The
  complete rerun passed.
- The standard `npm run build` with Turbopack passed. Its existing Atkinson
  Hyperlegible Next fallback warning remains. `git diff --check` passed, and no
  new em dash was introduced. The current-branch push runs the existing Checks
  and Square Cloud Deploy workflows.
