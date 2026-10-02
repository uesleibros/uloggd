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
