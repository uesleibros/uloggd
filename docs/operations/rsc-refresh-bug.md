# `router.refresh()` does nothing in a production build

Open, not fixed. Found on 2026-09-29 by running the browser suite against a
built server for the first time (`npm run test:e2e:built`).

## What a user sees

Open a run at `/pt-BR/journal/<public_id>` as its owner. Press **Detalhar a
jornada**, pick a status, save. The dialog closes and the line under the title
still reads **Detalhar a jornada**, for ever. Reload the tab by hand and the
status is there.

The write is not lost. Only the page is stale.

## Where it happens

- **Production only.** `npm run test:e2e:built` fails; the same tests against
  `next dev` pass. Same commit, same code.
- Two tests in the suite cover it:
  - `tests/e2e/journal.spec.ts` → "a run says what kind of run it was"
  - `tests/e2e/playthrough-flow.spec.ts` → "copy, run, session, timeline,
    numbers" (this one is also flaky for a second, separate reason: see below)

## What was measured

Instrumenting the page during a built run:

| question | answer |
| --- | --- |
| Does the write reach the database? | Yes. `GET /api/v1/journal/journeys/<id>` answers `COMPLETED`. |
| Does `router.refresh()` fire? | Yes. `GET /pt-BR/journal/<id>?_rsc=…` goes out and returns 200. |
| Does the payload carry the new data? | Yes. `COMPLETED` is in the response body. |
| Does the page update? | No, not in 25 seconds. |
| Does a full reload update it? | Yes. |

So the server renders the new state and sends it, and the client does not
apply it.

## Ruled out

- **`cache-handler.js`.** Commented out of `next.config.ts`, rebuilt: same
  failure. It is not the data cache.
- **The service worker.** `public/sw.js` caches only `/_next/static/` and lets
  navigations through untouched. RSC requests match neither branch.
- **The order of `setOpen(false)` and `router.refresh()`** in
  `components/social/journey-details.tsx`. Swapped: no change.
- **The route being cached.** `/[lang]/journal/[id]` builds as `ƒ`, and the
  API route it reads is `force-dynamic`.

## What it is

`proxy.ts`. Returning early from the proxy for RSC requests makes the bug
disappear:

```ts
export async function proxy(request: NextRequest) {
  if (request.headers.get("rsc") === "1") return NextResponse.next(); // DIAGNOSTIC
```

With that line the journal test passes in a built run. It is not a fix: it
takes every auth check off the RSC path, so a signed-out reader could pull the
payload of a page they may not read.

## Two fixes that were tried and are wrong

1. **`let response = NextResponse.next()` instead of `next({ request })`** at
   the top of the proxy (`proxy.ts`, currently line 115).

   This *does* fix the refresh: `journal.spec.ts` goes from failing to 3 of 3.
   But it breaks hydration. `signed-in-flows.spec.ts` → "the developer key
   lifetime opens the site's own dropdown" then fails about half the time with

   ```
   strict mode violation: locator('.settings-api-select') resolved to 2 elements:
     1) id="base-ui-_r_0_"              ← from the server's HTML
     2) id="base-ui-_R_19pkluiv5eivb_"  ← from the client's render
   ```

   Two ids for one control is React failing to hydrate and rendering the tree a
   second time. `{ request }` is what hands the render the session cookie the
   proxy may have just rotated; without it the server can render signed out
   against a signed-in browser. The same duplicate shows up as
   `.game-copies` resolving to two elements in `playthrough-flow.spec.ts`.

2. **Keeping `{ request }` for documents and dropping it only for RSC
   requests** (`request.headers.get("rsc") === "1"`). Does *not* fix the
   refresh. So the override header is not the whole story: the early return
   above also skipped the auth work and the cookies that work sets on the
   response, and one of those is the other half of the cause.

## Where to look next

The early return works and the response-shape change does not, so the
difference is in what the proxy *does* between them. The next thing to isolate
is whether an RSC response carrying `Set-Cookie` (written by the Supabase
`setAll` callback, `proxy.ts` around line 190) is what the client router
rejects. Bisect the proxy for RSC requests: keep the auth check, drop only the
cookie writes, and see which half restores the refresh.

Whatever the shape of the fix, it has to hold all three of these at once:

- `router.refresh()` updates the page in a built run.
- A document request still renders with the cookie the proxy rotated, so
  hydration matches (no duplicated `base-ui-…` ids).
- An RSC request is still refused for a reader who may not see that page.

## The other half of `playthrough-flow`

That spec is flaky on its own, with two symptoms across runs: the duplicate
`.game-copies` above, and a `toContainText` that runs out of time. Worth
separating from this bug rather than reading them as one thing.

## How to reproduce

```
npm run test:e2e:built -- journal --project=desktop-chromium --workers=1
```

Expect "a run says what kind of run it was" to fail after waiting 25 seconds
for a status that is already in the database. The same command without
`:built` passes.
