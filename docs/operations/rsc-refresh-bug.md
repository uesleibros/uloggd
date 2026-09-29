# A production RSC refresh can stall after a journey edit

Found on 2026-09-29 with `npm run test:e2e:built`. The journey edit is saved,
and the new server component payload arrives, but an intermittent client router
transition does not commit it. The journey page can then remain stale until a
full reload. `next dev` has not shown the failure.

## User-visible symptom

Open a run at `/pt-BR/journal/<public_id>` as its owner. Choose a status in
**Detalhar a jornada** and save. On an affected production run, the dialog
closes but the page does not show the new status. Reloading the tab shows it.

## Measurements

| Observation | Result |
| --- | --- |
| The journey write | `GET /api/v1/journal/journeys/<id>` returns `COMPLETED`. |
| The refresh request | `GET /pt-BR/journal/<id>?_rsc=...` returns 200 with `text/x-component`. |
| The RSC payload | Contains `COMPLETED`. |
| The rendered page on a failed run | Does not update within the test's 25 second timeout. |
| A full reload | Renders the saved status. |
| The RSC response cookies in the failing run | No `Set-Cookie` header. |
| The Supabase proxy cookie callback in that run | `setAll` was not called. |

The write, server read, and RSC response are correct. The failure is at the
client transition that should apply the response. The exact internal React or
Next.js scheduler condition remains unconfirmed.

## Why the proxy hypothesis was wrong

An earlier single run passed after inserting this diagnostic at the top of
`proxy.ts`:

```ts
if (request.headers.get("rsc") === "1") return NextResponse.next();
```

This was a false positive. The installed Next.js 16 proxy guide says Flight
headers, including `rsc`, are removed from `request.headers` by default. Logs
confirmed that the value was `null` for actual RSC requests. The diagnostic
branch was never entered. With `skipProxyUrlNormalize: true`, the header became
visible; a repeated run with the actual early return still failed once in
four attempts. That temporary bypass was reverted because it removes auth
checks from the RSC path.

The proposed `Set-Cookie` cause was also falsified. A failed RSC response had
no `Set-Cookie`, and the Supabase `setAll` callback did not run. Suppressing
that callback's response cookie writes did not reliably change the result.
There is no cookie-write change in the fix.

Two earlier response-shape changes are still wrong:

1. Replacing `NextResponse.next({ request })` globally with
   `NextResponse.next()` risks a document render using a session cookie that
   the proxy has just rotated but has not passed to the server. A prior run
   showed duplicated `base-ui-...` controls after hydration.
2. Changing only RSC responses based on `request.headers.get("rsc")` does not
   address the issue. The header is stripped in the default proxy setup, and
   the stalled transition has also been observed with no response cookies.

The previous three-pass journal result for the first change and single-pass
result for the early return did not establish a fix. Repeated production runs
showed that the journal test can pass or fail without either proxy change.

## What changed

After a successful journey save, `JourneyDetails` still calls
`router.refresh()`. While that refresh is pending, a short urgent state update
every 250 ms prompts React to retry the stalled transition. The updates stop
when a new `overview` prop arrives or after five seconds, and both timers are
cleaned up. This is a bounded client-side recovery for the observed transition
stall. It does not alter proxy authentication or cookie handling.

A diagnostic version using urgent updates passed eight repeated built journal
runs. The final bounded version passed the complete built journal spec. An
earlier diagnostic that merely waited one second before refreshing failed in
three of eight repeated runs, so the recovery does more than delay the
request.

The mechanism is consistent with a [reported Next.js production router
transition issue](https://github.com/vercel/next.js/issues/96233), but this
repository has not isolated the framework's internal cause. Remove the
recovery if a future Next.js release reliably commits these RSC transitions.

## Verification

Run each built E2E spec separately, with port 3100 clear before each run and
the local E2E environment loaded:

```text
npm run test:e2e:built -- journal --project=desktop-chromium --workers=1
npm run test:e2e:built -- signed-in-flows --project=desktop-chromium --workers=1 --repeat-each=4
npm run test:e2e:built -- moderation --project=desktop-chromium --workers=1
npm run test:e2e:built -- api-only-browser --project=desktop-chromium --workers=1
```

On the final implementation these passed 6/6, 24/24, 11/11, and 4/4,
respectively. The moderation suite also sends an RSC request from a non-staff
account and asserts the Flight payload carries `NEXT_HTTP_ERROR_FALLBACK;404`.
The proxy remains intact. The signed-in flow includes the developer key
dropdown that detects duplicated `base-ui-...` controls. A baseline run with
the original proxy had intermittent duplicated controls in that suite, so
this pass is evidence of no regression in this run, not proof that the
independent hydration flake is gone.

## Other findings kept separate

Commenting out `cache-handler.js` did not help. The service worker caches only
`/_next/static/`. The journal route is dynamic. Swapping `setOpen(false)` and
`router.refresh()` did not help.

`tests/e2e/playthrough-flow.spec.ts` has its own intermittent failures:
`.game-copies` sometimes resolves to two elements, and a separate
`toContainText` assertion can time out. Diagnose these independently from the
journey refresh.
