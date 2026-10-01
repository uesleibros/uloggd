# Release candidate audit, 30 September to 1 October 2026

Initial branch: `main`. Initial HEAD: `c703cecc815b21ced12afd87e94adad16298e864`.
`git pull origin main` confirmed the checkout was current and clean.

The delivery commit contains this report. Its exact hash and remote workflow
results are reported with delivery. No Git configuration was changed.

## Scope and changes by area

The existing core was reviewed without adding product systems. Game/Copy/Journey/
Session responsibilities, the current Home, Series equivalence, optimistic Ignore
reconciliation, neutral list marks, many-to-many folders and unified reviews remain
intact. Installed Next.js guides were read before framework changes.

| Area                            | Corrections and preserved behavior                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API reads                       | Unreadable HTTP 200 responses and missing data envelopes now fail explicitly; a valid `{ data: null }` remains valid. Retained data does not hide current errors. Access failures invalidate retained answers, including during tierlist retry.                                                                                         |
| Search                          | Entity/catalogue errors appear beside known results. Unknown/failed reads do not claim empty results or zero totals. Publisher/engine options belong to their query and attempt, abort obsolete reads and provide retry. Header game history also provides recovery. Catalogue actions wait for known library state.                    |
| Profile, archives, connections  | Counters remain unknown until confirmed and retain known values during retry. Failed refreshes have recovery. Confirmed content remains visible; empty claims require successful reads.                                                                                                                                                 |
| Games and copies                | Failed library pages retain known games and expose retry. Incomplete hero totals are withheld; a complete shelf survives failed refreshes. Copy pagination aborts old reads, retries the failed cursor and invalidates retained pages on access loss. Initial game-copy read failures are visible.                                      |
| Lists, folders, tierlists       | Filter Back/Forward restores URL state. Generations guard old filter/page responses; append de-duplicates rows. Malformed list answers fail. Folder reads no longer silently become empty, and known memberships survive failures. Denied tier boards cannot expose an older server snapshot during retry.                              |
| Series                          | Failed library/Ignore reads produce a recoverable error instead of invented progress. Equivalence and denominator policy are unchanged.                                                                                                                                                                                                 |
| Playlog                         | Initial session failures have retry. Focus, visibility, reconnect and cross-tab changes reconcile the bar while preserving drafts. Read generations and abort signals prevent a pre-save read from overwriting a confirmed note. Concurrent reads/writes do not append duplicate event IDs.                                             |
| Session images                  | Reads must succeed before saving. Successful uploads/deletions are recorded as each finishes; retry does not repeat earlier successes. A new session ID is retained after an image failure, so retry updates it instead of creating a duplicate. Failed sensitivity/reorder writes are honored and rejected requests unlock the editor. |
| Screenshots                     | Failed deletion keeps its card, reports an error and unlocks retry. Gallery read failures preserve known content and do not claim empty results.                                                                                                                                                                                        |
| Settings, wallet, notifications | Account sessions, login methods, passkeys, keys, devices, image history, privacy lists and wallet history expose read failures with recovery. Notifications retain confirmed items while refreshing. Clipboard success requires confirmation and rejection offers manual copy.                                                          |
| Image fallback                  | Quick cards use SafeImage. Import avatar failure belongs to its source, allowing a replacement image to load.                                                                                                                                                                                                                           |

## Visual and mobile changes

Controls share a thin lilac hover contour and a stronger visible keyboard focus
outline. Button shadows no longer differ between components. Branded social
controls keep their colors; disabled, selected and destructive states remain
distinct. Profile shortcuts place 24 px SVG icons in separate 62 px circles,
instead of applying padding and borders directly to SVGs. Icons do not shrink
inside buttons, and their overflow does not clip strokes.

Home composition, dense cover scales, social interactions and the shared media
viewer were preserved. Recovery messages use the shared localized component in
pt-BR, English and Spanish. Session kind controls announce their pressed state.

## Security, performance, API and database

- Account deletion and website moderation reject a different browser origin
  before authentication/writes, using the existing forwarded-host-aware helper.
  The new regression verifies both refusals and that the account remains usable.
- Proxy authentication and cookie propagation were not changed. Denied RSC and
  repeated authenticated document/dropdown tests continue passing.
- Avatar, banner, screenshot and journal uploads retain server decoding,
  normalization, resizing and classification of the exact published bytes.
  Browser classification remains advisory. Existing limits and revoked direct
  inserts remain covered by database/upload tests. Busy queues, invalid images
  and unavailable screening now produce distinct recovery messages.
- Expired image waiters release queue capacity immediately. Positive integer
  concurrency/queue configuration is validated.
- IGDB checks its circuit breaker again after waiting for a budget slot and
  bounds external Retry-After delays. TTLs, shared reads, stale fallback,
  batching, request budgets and throttled logs remain intact.
- Next.js, `@next/env` and `eslint-config-next` are pinned to 16.3.8; Sharp to
  0.35.4. Compatible transitive patches are in the lockfile. Initial installation
  reported seven affected packages; updated installation reports zero.
  Upstream advisories: [Next.js ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j),
  [Next.js AVIF](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4),
  [Sharp](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
- All seven existing trigram indexes were confirmed. Branch planner checks and
  a temporary 50,000-name benchmark are in [the index audit](search-index-audit.md).
  They establish eligibility and synthetic growth behavior, not application
  latency. No permanent migration, index or production data change was needed.
- API endpoints/contracts remain intact. The pass adds client validation,
  recovery and website origin guards, without another data access layer.
- The installed error-boundary API uses `retry`. Both CI workflows generate
  route types and MDX sources before TypeScript. Checks runs without database
  secrets; deployment independently gates packaging/upload on types/lint/unit.
  Generated Playwright artifacts are excluded from ESLint to prevent cleanup
  races. These workflows do not configure branch protection.

## Production streaming and flakes

[The RSC diagnosis](rsc-refresh-bug.md) was extended, not deleted. Set-Cookie was
already falsified as the cause. The bounded Journey recovery stays enabled;
passing tests with it do not prove the framework no longer needs it.

An observer captured duplicate settings/game markup inside a hidden `S:` streaming
fragment, alongside one visible control. Settled pages had one control and no
browser hydration errors. Settings tests use accessible roles and assert unique
controls; the playthrough test asserts one visible copy section. No timeout was
increased, forced click added or assertion removed.

The first complete run exposed the same selector problem for a library body
and a studio link on mobile. Eight measured document loads captured hidden
`S:` fragments on six loads; settled pages had one visible body/link and no
browser errors. These tests now assert one visible/accessibly named element,
and the visitor test waits for all four fixture cards before checking privacy.

Both projects also failed a library recovery test that used a real account.
The harness catalogue contains fixture IDs, so it returned real library rows
without matching catalogue games. The application correctly kept reporting
that the games could not be loaded. The test now creates and removes its own
fixture library, checks the failed read does not claim empty, retries and
requires the expected card. The profile integrity test likewise uses its own
account when credentials are available, instead of depending on a Home link.

An isolated UI rerun also caught the hidden streaming copy of the game share
button. The share/score/rail test now requires one visible element of each
before checking their geometry. An initial replacement studio locator matched
two legitimate visible credits. Its final scope combines the title-credit class
with the accessible link name; it preserves the destination assertion. These
intermediate failures were corrected rather than retried by the runner.

The second complete run caught the same problem in a list byline selector.
Eight list document loads captured its hidden `S:` copy on two loads, with one
visible author and no browser errors on all settled pages. The test now scopes
the description and byline to visible elements, asserts each is unique and
retains the checks for preserved line breaks and normal letter spacing.

That run also caught a duplicated report-card selector in mobile moderation.
Its initial report selectors now require one visible card. The serial group
stopped after the failure, so eight following moderation tests did not run;
they are not counted as successes or ordinary platform skips. Both complete
moderation projects are revalidated before the final complete run.

The first isolated moderation rerun passed 20 cases but its desktop phone-size
case found two `main` elements, leaving one subsequent case unrun. The ready
console selector now combines the accessible `main` role with its readiness
class, requires exactly one and retains the document-width assertion. This
addresses the same inactive document fragment rather than changing layout.

The third complete run found hidden streaming copies of the privacy document
and the mobile playing button. Positive content reads now target the visible
document/control and retain uniqueness, text, write and reload assertions. The
same positive-read review covers Journey facts and statistics panels. Raw
absence checks for unauthorized content remain unchanged.

A later complete attempt caught the hidden server copy of a public screenshot
description. That assertion now scopes its exact text to the accessible `main`;
API visibility, owner, gallery and image assertions remain intact.

The same attempt crossed into October and exposed an independent calendar-test
bug: it looked for 28 September while October was displayed. The screenshot
confirmed the current-month calendar, and no save had been attempted. The test
now navigates to the previous month, requires an unlogged first day, writes a
session, checks the increased total, navigates back to that month after the
calendar remounts, deletes the day and checks the original total. This covers
month navigation on every run without increasing timeouts or changing dates in
the application.

The new list recovery regression also caught an initial hidden copy of its
confirmed card in that attempt. It now requires exactly one visible card and
keeps the failure/retry, retained-content and Back/Forward checks unchanged.

The initial playthrough baseline passed four repeats. Eight final repeats passed.
The historical separate `toContainText` timeout was not reproduced in those runs.
The independently identified session read/write race has a held-response regression;
it is not presented as the proven cause of the historical timeout.

## Validation

Local Node.js: 24.19.0. CI Node.js: 22.

The normal Turbopack build compiled successfully and generated 156 static
pages. Its one warning reports missing fallback override metrics for the
Atkinson Hyperlegible Next font. This is retained in the build result.

| Check                                      | Result                                                       |
| ------------------------------------------ | ------------------------------------------------------------ |
| Updated npm ci                             | Passed; audit reports 0 vulnerabilities                      |
| TypeScript                                 | Final repeat passed after route/MDX generation               |
| Lint                                       | Final repeat passed with 0 errors and 0 warnings             |
| Unit                                       | Final repeat: 357 passed, 0 failed, 0 skipped                |
| Database                                   | Final repeat: 191 passed, 0 failed, 0 skipped                |
| Normal production build                    | Passed with Turbopack; font fallback-metrics warning         |
| Complete built E2E, both Chromium projects | 341 passed, 0 failed, 53 platform skips, 0 not run; 30.3 min |

The first complete run returned 335 passed, 4 failed and 55 skipped in 29.5
minutes. Its four failures are explained above; the final result is recorded
after repeating the corrected specs and complete suite. Both real-upload specs
ran and passed on desktop and mobile; image services were not skipped.

The second complete run returned 331 passed, 2 failed, 53 existing platform
skips and 8 tests not run after the moderation failure, in 28.6 minutes. The
two selector corrections above are followed by isolated and complete reruns.

The third complete run returned 339 passed, 2 failed, 52 platform skips and
1 test not run after the game-state serial failure, in 30.9 minutes. Its two
failures were strict-selector matches against hidden streaming copies, as
documented above. These results are intermediate, not the final release gate.

The fourth complete run returned 335 passed, 4 failed, 53 platform skips and
2 tests not run after the calendar serial failures, in 25.6 minutes. The
failures were the public screenshot selector, the confirmed list-card selector
and the calendar's missing previous-month navigation on both projects. All
three test files are corrected and revalidated before the delivery run. No
application source was changed in response to these four test failures.

The fifth complete run used frozen application and test sources and passed:
341 passed, 0 failed, 53 platform skips and 0 tests not run, in 30.3 minutes.
Desktop returned 192 passed and 5 viewport skips; mobile returned 149 passed
and 48 skips. The latter include 35 request-only API tests already executed on
desktop and 13 viewport-specific cases. No credential or upload-service skip
occurred. Both real-upload specs also passed in this final run on both projects.
No runner retry, new skip, forced click or increased timeout was introduced.

Targeted built runs used one worker and cleared port 3100 before each invocation:

| Spec                                                            | Result                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| signed-in-flows, desktop, repeat 4                              | 24 passed                                               |
| playthrough-flow, desktop, repeat 8                             | 8 passed                                                |
| journal, desktop, repeat 4                                      | 24 passed                                               |
| moderation, desktop                                             | 11 passed                                               |
| api-only-browser, desktop                                       | 4 passed                                                |
| panel-recovery, desktop                                         | 3 passed                                                |
| release-recovery, desktop and mobile                            | 16 passed after the final card selector correction      |
| load-errors, desktop and mobile                                 | 6 passed                                                |
| library-series, desktop and mobile                              | 12 passed                                               |
| ui-stability, desktop and mobile                                | 13 passed; 5 existing viewport-specific skips           |
| route-integrity, desktop and mobile                             | 8 passed; profile checks no longer depend on Home links |
| list-marks, desktop, repeat 4                                   | 16 passed                                               |
| moderation, desktop and mobile after final selector corrections | 22 passed                                               |
| api-public-content, desktop and mobile, repeat 2                | 8 passed                                                |
| game-log, desktop and mobile, repeat 2                          | 20 passed                                               |
| game-state, desktop and mobile                                  | 3 passed; 1 existing mobile skip                        |
| search and list-editor-search, desktop and mobile               | 37 passed; 3 existing viewport-specific skips           |

Eight new browser regressions cover origin guards, list recovery/history, session
recovery/cross-tab drafts/reconnect, screenshot deletion, obsolete session reads,
incomplete library totals, partial image transactions and unavailable image reads.
Two unit regressions cover invalid successful responses and expired queue capacity.
The existing tierlist recovery test also covers access loss during a held retry.

After the last selector review, the search file selector also matched
`list-editor-search.spec.ts`: both Chromium projects returned 37 passed and
3 existing viewport-specific skips. Game-state returned 3 passed and its
1 existing mobile skip. The final Journey repetition returned 24 passed. The
application source was unchanged throughout these reruns; the later screenshot
and calendar selector corrections are documented above and revalidated before
the final complete suite.

## Browser inspection and limits

The integrated browser's Windows sandbox helper failed with
`SetNamedSecurityInfoW ... 5`. Inspection used installed Playwright Chromium,
actual clicks/keyboard input and screenshots.

Home was inspected at 1920x1080, 1440x900, 1366x768 and 390x844 in light and dark.
Another 20 routes were visited in both themes at 1440x900 and 390x844: profile,
search, game, games/copies libraries, reviews, lists, shots/detail, journey,
stats, retrospective, connections, wallet, profile/privacy/security settings,
public docs, login and moderation access. The 88 visits showed no horizontal
document overflow or browser page errors. Copy dialogs were opened and dismissed
on desktop/mobile. The final inspection also opened the profile menu and avatar
viewer, zoomed the image, closed with Escape and checked focus returned to the
avatar trigger in both themes and viewports. All eight shortcut SVGs measured
24x24 px with visible overflow. The desktop menu trigger had a 1 px contour,
no shadow and unchanged geometry on hover in both themes.

These are Chromium and mobile emulation checks, not hardware Safari or a native
phone keyboard certification. Catalogue fixtures do not establish real IGDB
latency. Database rules and separate real-upload tests provide other evidence.
New identity/provider integrations were not added or certified in this pass.

Next logs some early-closed streams during rapid navigation. Neither these logs
nor hidden streaming fragments establish a visible hydration defect. The internal
framework refresh stall is still unisolated; its bounded recovery is retained.
Remote workflow results for the exact delivery commit are reported with delivery.
