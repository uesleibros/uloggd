# uloggd roadmap

Complements `product-backlog.md`. The backlog holds product decisions still
under discussion; this roadmap orders the engineering work. Updated July 2026
after the loading/skeleton consistency pass.

## Done in the consistency pass (July 2026)

- Route-level `loading.tsx` skeletons for list detail, review detail, profile
  activity/lists/connections, and both settings sections.
- Settings skeletons no longer render a nested `<main>` inside the settings
  layout.
- A shared `LoaderCircle` + `.spin` pending indicator on every mutating action
  (follow, list edit/delete, item move/note, journey edit, library quick
  actions, cover preference, notification preferences).
- An `error.tsx` boundary for the `[lang]` tree matching the 404 design, with a
  retry action.

## Next: polish and correctness

1. **Instant navigation.** The `[lang]` layout awaits `getAuthUser()` and
   `getNavigationAccount()` (cookie-based), so route skeletons only appear
   after auth resolves on hard loads. Evaluate Cache Components or moving auth
   reads behind a `<Suspense>` boundary in the layout so the shell streams
   first.
2. **Per-section Suspense on heavy pages.** The game page and profile page load
   several independent data blocks; stream each section instead of blocking on
   the slowest one.
3. **Pagination.** Reviews, lists, activity, and connections currently render
   a single page of results. Add cursor pagination with loading rows that
   reuse the skeleton entries.
4. **Empty states.** Audit every list-like page for a designed empty state
   (icon, one-line explanation, primary action) instead of bare text.
5. **Optimistic updates.** Follow and library actions wait for the round trip.
   Where the RPC is idempotent, flip the UI optimistically and reconcile, as
   the like button already does.

## Later: features

1. **Global search improvements.** Search users and lists, not only games.
2. **Journey stats.** Yearly wrap-up (games played, hours, top genres) on the
   profile, honoring session visibility.
3. **List collaboration.** Shared lists with invited editors.
4. **Import.** Backloggd/Steam CSV import into the library.
5. **PWA.** Offline shell, installability, and push notifications (consent
   gated, see backlog §4).

## Release gate

Same as the backlog: PT/EN copy, responsive loading/empty/error states,
keyboard and screen-reader behavior, theme coverage, and Playwright checks.
