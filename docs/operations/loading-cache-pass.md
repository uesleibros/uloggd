# Loading and catalogue population pass

## Proven causes

The Redis adapter awaited optional population after a durable hit, and awaited
a durable read plus Redis population after a successful refresh write. Those
steps included compression and a remote round trip before returning usable data.
Next's installed `after` guide explicitly supports running optional work after
the response. Production now schedules population and invalidation there, while
durable writes and refresh leases still complete before a successful response.
The existing CLI preload marks command-line callers, which still await optional
population before closing their Redis clients; they have no HTTP response to
schedule work after.

Each worker retains at most four optional tasks. Read population captures at
most 128 answers and 4 MiB of serialized entries per task; entries over 4 MiB
are skipped. Refresh population reads at most 128 keys. Overflow, rejected
scheduling and Redis errors preserve the durable response. Timestamps, shared
leases, stale-copy checks, expiry and Redis memory limits are unchanged.

## Measurement

A local probe reused 32 recent public PostgreSQL answers under two temporary
Redis namespaces. Four rounds alternated blocking and deferred population, with
both namespaces cleared before each read and removed afterwards. It made zero
IGDB calls and did not read user progress.

| Population     | Response times, ms | Median, ms |
| -------------- | ------------------ | ---------- |
| Blocking       | 710, 549, 541, 474 | 545        |
| After response | 341, 388, 380, 430 | 384        |

This measures durable-hit catalogue reads that need Redis population. It is not
a claim about all page latency, warm L1 hits or production HTTP response times.
The background work was allowed to finish and verified by the same live Redis
client. The client and PostgreSQL pool were closed after the probe.

## Skeleton audit

| Area              | Correction                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Home              | A route group gives only Home its own placeholder without changing URLs. Cover shelves include title and metadata space.         |
| Library           | Loading uses the actual horizontal tabs, controls and responsive results grid. The old sidebar drawing was removed.              |
| Series and copies | The route reads the requested shelf and view, instead of promising games before opening Series.                                  |
| Library counters  | Their three slots are reserved while data arrives, including the mobile hero.                                                    |
| Search            | The route follows the scope: game covers, list cards, people/company rows or reviews. Six scope slots replace the obsolete five. |
| Profile           | Actions, navigation and recent covers replace the unrelated generic text stream.                                                 |
| Connections       | The route and client reuse the same avatar, copy and action placeholders in the real connections grid.                           |
| Screenshots       | Tiles reserve separate game title, author and action rows as the gallery does.                                                   |
| Year recap        | A hero, statistics and panels replace list-card placeholders.                                                                    |
| Profile shortcuts | Their loading files reuse the destination workspace, including lists, activity and screenshots.                                  |
| List URLs         | Usernames show the list workspace placeholder; content IDs show list details, using the existing `contentKey` rule.              |
| Settings          | Ten horizontal tabs and stacked form panels replace the seven-tab, three-column drawing.                                         |
| Game series       | A series strip reserves its heading, counters, progress track and cover slots while the second catalogue read streams.           |
| Companies         | The route uses the real catalogue and facts columns; upcoming games, trailers, events and rail cards have stream placeholders.   |

Game, wallet, detail, authentication, legal and moderation loading
templates already have dedicated shapes and were checked during the audit.
The generic locale fallback remains for pages without a dedicated wait state.
Unknown item counts and text wrapping still depend on the actual response; these
placeholders reserve the known structure rather than inventing content.

Home feed and viewer shelves keep successful payloads during background reads;
the first read remains the point at which a skeleton is shown. Access-denial
invalidation remains in `useApi` and no private data is stored in Redis.

Opening Series directly deliberately avoids loading the game collection. Its
hero therefore does not show collection counter placeholders that would never
receive an answer. Counts already loaded before switching tabs remain usable.

## Verification

The `loading-states` browser spec holds API responses explicitly. It checks the
shape for four search scopes, that a Series load does not insert game collection
placeholders, and the library's actual cover widths, heights, horizontal gaps
and vertical position
before and after loading, on desktop and mobile. Screenshots are saved locally.
It selects the loaded page frame so a streamed route fallback being removed
cannot be mistaken for the client skeleton under test.

Unit tests additionally hold Redis population unresolved while checking that
durable reads and committed refresh writes return, and check the bounded task
count and a rejected scheduler. Existing freshness and partial-outage tests
continue exercising the same shared lease authority.

Final checks:

- Typecheck and complete ESLint passed. Unit suite: 395 passed, zero failed,
  one existing skip for the private NSFW operator fixture.
- Built browser specs ran separately, clearing port 3100 before each and using
  one worker: `loading-states` 12, `series-workspace` 22, `library-series` 12,
  and `api-only-browser` 8 passed, across desktop and mobile.
- One initial desktop Series retry scenario reached page two without showing
  the intercepted 429 error. An isolated rerun and the complete 22-case rerun
  both passed; the first failure's cause remains unconfirmed.
- The standard Turbopack production build passed with the existing Atkinson
  Hyperlegible Next fallback-font warning. The final loading and API navigation
  checks were also run on that compiled production build.
