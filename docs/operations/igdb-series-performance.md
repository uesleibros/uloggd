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
- Local LRU memory is bounded to 8 MiB and 5,000 entries per process. Persistent storage
  is pruned to 256 MiB and 20,000 entries, with an 8 MiB limit per entry and
  seven-day retention for unused entries. Next's unbounded disk cache remains
  disabled. The former memory-only series cache and scheduled-slot limiter
  have been removed.
- This cache contains public catalogue data only. User holdings, playing states,
  ignored ids and progress are still read freshly under the caller's identity.
  Holdings and ignored ids are projected together in one SQL statement, avoiding
  a sequential database round trip and using one consistent RLS snapshot.
  Browser database roles cannot read or write the cache table. The private-data
  architecture guard separately checks the public catalogue boundary.

Migration `20261002000100_shared_igdb_catalog.sql` was the only pending migration
and was applied before deployment.

## Redis acceleration added on 2 October 2026

`REDIS_URL` enables a shared Redis layer in front of the durable public catalogue.
It covers raw IGDB query answers, game-to-series assignments and complete series
memberships through the same cache boundary. No user progress or private data is
placed in Redis. A worker first uses its local LRU, then Redis, then PostgreSQL;
only a genuinely cold answer requires IGDB. Existing persisted answers hydrate
Redis with their original fetch timestamps, without sending another IGDB request.

Refresh leases remain exclusively in PostgreSQL. This preserves one coordination
domain even when some workers lose Redis access and others remain connected.
Successful refreshes write durable storage before updating Redis. Expired refresh
writers cannot overwrite durable answers, and delayed Redis fills cannot replace
a newer timestamp. Errors invalidate the acceleration copy and preserve the
durable cooldown. Cache loss never becomes an empty or successful series answer.
Refresh coordination consults durable storage when the Redis copy is stale,
so a skipped acceleration write cannot hide a newer successful durable answer
from another worker or hold it polling an obsolete copy.

### Memory and traffic ceilings

The dedicated `igdb-cache` instance has 512 MB of container memory. On inspection
it reported `maxmemory: 0`, `maxmemory_policy: noeviction`. An attempt to set a
256 MiB native limit and `allkeys-lru` was rejected with `NOPERM` on `config|set`.
The application therefore enforces its own limits without depending on provider
configuration permissions:

- Atomic Lua scripts implement actual LRU across workers, with unique ordering
  for hits in the same millisecond. The public namespace retains at most 20,000
  answers and a 128 MiB charged budget. Each charge includes the encoded answer,
  key bytes and a conservative 1 KiB allowance for metadata. This is a namespace
  budget, not a claim that Redis allocator RSS equals JSON length.
- Each accelerated entry is at most 256 KiB. Larger complete answers remain in
  durable storage. Answers of at least 2 KiB are asynchronously compressed with
  fast gzip when it reduces storage size; small and incompressible answers stay
  unchanged. Decompression has a 256 KiB output limit. Writes are split into at
  most 512 KiB payload batches.
- Each Redis read returns at most 4 MiB of decoded answers and examines at most 512 keys. Oversized
  response tails are treated as misses and read from durable storage. At most
  four Redis operations run per worker, with a bounded 32-operation waiting queue.
- Before adding data, the write script checks `INFO memory`. At 384 MiB of either
  used memory or allocator RSS it skips acceleration writes, retaining headroom
  for the 512 MB container. Durable writes and normal responses still succeed.
- Answers older than seven days are not served by Redis. Expired accessed entries
  are removed, unused entries are pruned during writes, and both namespace keys
  expire after seven idle days. A partially evicted namespace is reset atomically
  and rehydrated from durable storage. No flush command or unrelated-key deletion
  is used.
- Connections are reused per worker, offline queuing is disabled, and connection,
  command and queue waits have bounded deadlines. The Node Redis command timeout
  ends at dispatch, so an additional 1,500 ms deadline covers the reply and
  destroys an unresponsive connection. A network failure opens a
  30-second cooldown with immediate durable fallback. Logs never expose URLs,
  credentials or raw driver errors.

The provider can still consume memory outside the application namespace. Native
limits, when available in the provider panel, add another safeguard; the app does
not change unrelated Redis settings or guarantee an absolute container limit for
other clients, provider snapshots or arbitrary configuration changes. See Redis's
[eviction documentation](https://redis.io/docs/latest/develop/reference/eviction/)
and [Node client production guidance](https://redis.io/docs/latest/develop/clients/nodejs/produsage/).

### TLS and production environment

The first connection failed with `DEPTH_ZERO_SELF_SIGNED_CERT`. The instance's
already-downloaded `certificate.pem` authenticated it successfully. Only its
certificate blocks were copied into the ignored local environment; no private
key was copied. TLS chain and host verification remain enabled. The provider
documents its per-instance certificates on the
[Redis hosting page](https://squarecloud.app/en/databases/redis).

Configure `REDIS_URL` and either `REDIS_CA_CERT` (PEM, literal escaped newlines
also accepted) or `REDIS_CA_CERT_PATH` (a deployed certificate path). These are
runtime server variables and must never have the `NEXT_PUBLIC_` prefix. Local
`.env.local` values are not included in the deploy artifact. The current CLI key
was refused access to application environment routes with `MISSING_SCOPE`, HTTP
403, so production variables require a key with that scope or the provider panel.
Until configured, production keeps using its durable public cache.

Inspect counts, memory and policy without printing credentials:

```sh
node --require ./scripts/catalog-runtime.cjs --conditions=react-server --import tsx scripts/check-igdb-redis.ts
```

The first hydration reused all 1,170 assignments and 341 complete catalogues,
with 5,220 main memberships and **zero IGDB requests**. A new-process local read
also made zero IGDB requests and took 2,142 ms for this entire catalogue. This
large local transfer is not a production page speed measurement. After hydration,
the 1,511 entries had a 4,384,879-byte charged budget; the server reported
10,060,040 used bytes and 32,677,888 resident bytes. Warm local LRU hits require
neither Redis nor PostgreSQL catalogue reads.

The later hydration copied all 8,336 recent complete public answers, including
raw queries, without calling IGDB or reading user tables. After compression,
the Redis namespace charged 18,764,694 bytes including its per-entry allowance;
the server reported 15,393,648 used bytes and 40,783,872 resident bytes. A fresh
local process read the entire 341-series catalogue in 1,967 ms with no IGDB calls.
These large local catalogue transfers include a remote TLS connection and are
not a claim that every site page loads in that time.

Rehydrate the current public snapshot, preserving timestamps, with:

```sh
node --require ./scripts/catalog-runtime.cjs --conditions=react-server --import tsx scripts/warm-igdb-redis.ts
```

Before compression, a ready standalone server with three compiled workers was
measured with the private 100-game benchmark. It returned the same 47 series and
56,126 bytes in 2,966, 392, 430, 375, 367 and 364 ms. A temporary observer recorded
two Redis reads (197 and 1,025 ms), followed by local cache hits, with no public
catalogue SQL or IGDB fetches. An earlier uninstrumented run had a 26,429 ms first
response and 368 to 420 ms subsequent reads; the outlier's cause was not proven
and it is not used as a speed comparison. Temporary accounts were removed.

Tests against the real instance use an isolated random namespace and delete
only their own keys. They verify LRU hits including same-millisecond ordering,
entry/count/byte ceilings, timestamp preservation, rejection of late fills,
empty complete answers, expiration, partial eviction, cleanup and the server
pressure guard. Unit tests separately exercise durable fallback, shared refresh
leases during a partial Redis outage, incomplete batches and bounded stalled
handshakes. Private progress remains freshly read by the existing RLS endpoint.

The Redis pass also ran both browser specs separately with port 3100 cleared:
`series-workspace` passed 22 cases and `library-series` passed 12. The former's
ignore/unignore test initially reloaded before the delayed writes completed;
it now awaits the actual POST and DELETE responses while still verifying both
optimistic transitions before the responses. The complete rerun passed. A
database lease test now checks freshness over 60 seconds instead of assuming
several real SQL round trips always finish within one second; all four durable
cache tests and the real Redis integration case passed.
Browser catalogue fixtures bypass the public cache; the browser runs verify UI
and fresh private progress, while the live Redis tests verify storage behavior.
The final typecheck, full ESLint run, 393 passing unit tests (one existing private
NSFW fixture skip) and standard production build all passed. Temporary benchmark
account cleanup was confirmed with zero remaining accounts.

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

The first successful production deployment was also checked through
`https://uloggd.com`: the same private 100-game benchmark returned 47 series on
all six requests, in 3,075, 1,514, 1,053, 1,024, 2,372 and 1,241 ms. These are
complete HTTP timings with API-key authentication, not just catalogue lookup
times. The temporary account was removed and cleanup was confirmed. This
measurement preceded combining the two private reads into one SQL statement.

- Typecheck, complete ESLint run and unit suite passed: 384 passed, zero failed,
  one skipped because the private operator NSFW fixture is absent.
- PostgreSQL cache tests: four passed against the real database, with test keys
  removed afterwards.
- Production-build browser specs ran separately, with port 3100 cleared and one
  worker: `series-workspace` 22 passed and `library-series` 12 passed, on desktop
  and mobile. An initial mobile failure matched both the visible back button and
  hidden streamed markup; the selector now checks the visible control. The
  complete rerun passed.
- The final single-statement private projection was subsequently verified by a
  full 22-case production-build `series-workspace` rerun on both devices. This
  covers summary, complete progress, exclusions, editions, updates and caller
  isolation with the actual database, without caching private progress.
- The standard `npm run build` with Turbopack passed. Its existing Atkinson
  Hyperlegible Next fallback warning remains. `git diff --check` passed, and no
  new em dash was introduced. The current-branch push runs the existing Checks
  and Square Cloud Deploy workflows.
