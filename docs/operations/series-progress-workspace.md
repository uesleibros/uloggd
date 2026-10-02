# Global Series Progress validation

## Delivered behavior

The owner's Library exposes Games, Copies and Series. Series uses
`/{lang}/library/{username}?shelf=series`; visitors do not receive the private
workspace. The normal Library keeps its six-row discovery summary and links to
the complete workspace. Six is a page size, not a limit on relevant series.

The complete view includes every selected series with at least one held game
and at least two canonical slots. Search, ordering, filters and pagination live
in the URL and survive reload and browser history. All includes unstarted and
all-ignored series. In progress means at least one counted slot was started and
not every counted slot is complete. Completed requires a positive denominator
and all counted slots complete. BACKLOG and WISHLIST do not count as played.

Explicit remake, remaster, port and edition relations satisfy one canonical
slot. Sequels, DLC and expansions do not satisfy a different base game. The
visible explanation retains which variant supplied the state. Ignore removes
the canonical slot from progress and next-up selection and updates global
classification immediately through the existing optimistic write queue.

## Data path

- New `GET /api/v1/library/series`, requiring `library.read`, accepts only the
  verified caller as owner. Owner selectors in query parameters are rejected.
- Library states and all ignored ids are read in one owner transaction. The
  transaction ends before catalogue requests begin.
- The browser receives a compact global name/id/state index and at most six
  detailed rows. Missing visible rows use one request for their series keys.
- The full view skips the regular all-game hydration and the summary request.
- IGDB memberships use stable pages of 500 rows, ten queries per multiquery
  request, and edition parent batches of 100 unique ids. Every page is retained.
- Existing shared catalogue caching, in-flight sharing and throttling remain.
  Series catalogue queries use the existing 12-hour cache.
- Incomplete or failed catalogue reads fail explicitly. The browser retains
  known pages on transient failures, offers retry, and clears private content
  after an access denial.
- `GET /api/v1/library/ignored` no longer truncates at 500 ids. No migrations
  or new tables were necessary.

Main implementation files are `lib/series-policy.ts`, `lib/series-shelf.ts`,
`lib/series-catalog.ts`, `lib/series-view.ts`, `lib/library-series-data.ts`,
`lib/igdb.ts`, `app/api/v1/library/series/route.ts`, and the shared Library
views, row and workspace components.

## Related profile and control fixes

The profile banner opens the same original-image lightbox as the avatar. Escape
restores trigger focus. Action controls and display names keep plain labels;
muted handles retain their text-link underline and links keep the lilac hover.

## Local release checks, 1 October 2026

`npx tsc --noEmit` and `npx eslint .` passed after the final source edit.
`npm run test:unit` returned 375 passed, zero failed and one skipped. The skip
requires an operator-supplied private NSFW regression image, absent in this run.
The focused `npx tsx --test tests/unit/series-*.test.mts` run passed 33 tests.
Coverage includes status semantics, equivalence, Ignore classification, stable
search/order, 100 series in batched rounds, more than 500 members, and 1,201
edition parent ids without truncation.

```text
npx tsx --test tests/db/ignored-games.test.mts tests/db/library-status.test.mts tests/db/library-privacy.test.mts tests/db/playing-status.test.mts
```

The database run passed all 12 tests with no skips. These exercise real database
policies and roll back their changes.

Each browser spec ran separately against a production build, with port 3100
cleared before each and one worker:

```text
npm run test:e2e:built -- tests/e2e/series-workspace.spec.ts --workers=1
npm run test:e2e:built -- tests/e2e/library-series.spec.ts --workers=1
npm run test:e2e:built -- tests/e2e/library.spec.ts --workers=1
npm run test:e2e:built -- tests/e2e/library-copies.spec.ts --workers=1
npm run test:e2e:built -- tests/e2e/control-feedback.spec.ts --workers=1
npm run test:e2e:built -- tests/e2e/context-menu.spec.ts --workers=1
```

| Spec             | Desktop passed | Mobile passed | Platform skips |
| ---------------- | -------------: | ------------: | -------------: |
| series-workspace |              9 |             9 |              0 |
| library-series   |              6 |             6 |              0 |
| library          |              2 |             2 |              0 |
| library-copies   |              7 |             5 |              4 |
| control-feedback |              9 |             9 |              0 |
| context-menu     |             10 |            10 |              0 |
| Total            |             43 |            41 |              4 |

All 84 executed browser tests passed. The four existing Copies skips are
intentional device-specific cases. The new banner test verifies original URL,
closing by Escape, restored focus and the still-functional avatar viewer on
both devices. Initial workspace failures were corrected tooltip/error selectors;
the final complete workspace run passed all 18 cases.

The standard `npm run build` (Next.js 16.3.8, Turbopack) passed after these
browser runs. Its existing warning concerns missing fallback font override
values for Atkinson Hyperlegible Next. The release also passed `git diff --check`; temporary logs and
generated browser/build artifacts are excluded from the commit.

## Real limits

Equivalence depends on explicit IGDB relations. Missing or incorrect upstream
relations cannot be safely guessed from names. A cold read of a large library
still needs its complete membership index to calculate truthful global counts.
Detail pages reuse catalogue caching. Browser tests use the gated IGDB fixture
catalogue and real temporary database accounts; they do not establish upstream
catalogue accuracy or measure production latency.

The original production RSC refresh investigation and the independently flaky
playthrough-flow spec are separate work. This delivery does not establish a new
root cause for either.

## Follow-up: loading, controls and context actions

Production logs retrieved on 1 October (local time) contain real IGDB 429
responses and circuit-breaker refusals at 02:25 through 02:28 UTC on 2 October.
They establish upstream rate pressure, although they do not identify which page
originated each request. Batching was already present. The additional avoidable
work was keyed by the whole multiquery group: a six-series summary, an eight-series
workspace and a later detail page could regroup and reread the same memberships.

`createCatalogBatchCache` now stores complete public catalogues by series and
variant mode. Overlapping reads share requests and only missing keys reach the
existing paged multiquery reader. Library states and ignored ids remain private
and are read freshly per caller. The cache is bounded to 256 series and 20,000
items. It retains entries for 12 hours; an upstream failure can reuse an existing
complete entry for an additional 24 hours. Failed keys have a 30-second retry
cooldown. Incomplete batches are never remembered. Strict network validation
still rejects missing multiquery results and a cold unavailable catalogue still
returns an explicit error, rather than inventing an empty or complete series.

The workspace's first read carries its current URL filters and page. Reloading
page two therefore does not fetch page one followed by a second detail request.
A failed detail-page retry requests only its missing keys. Upstream rate refusal
returns `rate_limited` and explains that the catalogue is temporarily busy.

Summary, initial workspace and uncached detail rows now reserve cover strips
with skeletons. Series filters use the same flat active underline and count
badges as other tabs. The full-view button uses an explicit control style and a
Lucide arrow. Back controls keep plain labels.

The shared pagers scroll smoothly to their own results heading, with a 96-pixel
sticky-header offset. Reduced-motion preference uses an immediate scroll. This
applies to Library, Series, search, screenshot galleries, journal timeline and
moderation lists. Query navigation disables Next's default page-top reset.
The scroll starts on the next animation frame: a browser probe reproduced
the immediate animation being cancelled when the clicked pager became disabled,
and confirmed the deferred animation reaches the results heading.

The profile background context menu now reads actions only from its header.
Content moderation controls below it cannot become duplicate profile actions,
and repeated identical action labels are deduplicated. A delegated menu action whose
trigger is outside the viewport brings the trigger into view before focusing
and opening its menu, preventing an invisible dropdown from locking the page.

Context actions are queued before requesting close, so an immediate close
completion cannot consume an empty queue. A menu accepts only one selection per
opening. Escape is consumed during window capture while the context menu is
open: the global menu and the image dialog have separate dismissal trees, and
their document listeners could otherwise close the underlying dialog first and
leave the context menu open. Closing the menu restores its original target;
the next Escape can close the image dialog.

The screenshot spec also exposed React hydration error 418 on screenshot detail
pages: their game link wrapped `GameMetaLine`, which contains a company link.
The same markup existed in the game page's similar-game rows. Both blocks now
have separate cover, title and company links. Similar rows also own their
context-menu identity instead of inheriting the parent game's actions. Browser regression
checks their destinations and fails on any page error while the like control
hydrates and saves.

### Follow-up validation

The final typecheck, full ESLint run, unit suite and standard Turbopack build
passed on 2 October 2026. Unit results: 380 passed, zero failed, one skipped
because the operator-supplied private NSFW regression fixture is absent.
The build retains the existing Atkinson Hyperlegible Next fallback warning.

Browser specs ran separately against production builds with one worker and
port 3100 cleared before each. Full runs and focused final reruns covered the
following unique cases; repeated cases are counted only once:

| Spec             | Desktop passed | Mobile passed | Platform skips |
| ---------------- | -------------: | ------------: | -------------: |
| series-workspace |             11 |            11 |              0 |
| context-menu     |             12 |            12 |              0 |
| search           |             16 |            15 |              3 |
| shots            |              5 |             5 |              0 |
| library-series   |              6 |             6 |              0 |
| Total            |             50 |            49 |              3 |

All 99 unique executed browser cases passed. The three Search skips are existing
device-specific cases. The final complete Context Menu, Shots and Library Series
runs passed 24, 10 and 12 cases respectively. The final Search pagination rerun
passed on both devices; the final Series skeleton/control and retry rerun passed
four cases. Initial failures exposed the Escape dismissal order and the cancelled
scroll animation described above. Selectors now distinguish visible completed
series from skeletons and streamed hidden markup. The comment-menu test waits for
the actual publication response before inspecting the saved comment.

Series screenshots were inspected in both themes on desktop and mobile,
including reserved cover skeletons. Cache tests cover overlapping reads,
summary/detail reuse, failed-batch integrity, bounded memory and cooldown without
fabricating cold data. These tests establish reduced repeated work and correct
failure handling, not an assurance that IGDB will never refuse a request.
`git diff --check` passed. Temporary logs, screenshots and generated build output
are excluded from the commit.
