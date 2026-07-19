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

## Done in the streaming/pagination pass (July 2026)

- Auth reads moved out of the `[lang]` layout's critical path: the sidebar and
  header tools resolve behind `<Suspense>` with a pending navigation fallback,
  so the shell and route skeletons stream immediately on hard loads.
- Cursor pagination with a "load more" control on the reviews feed, profile
  activity (`/api/activity`), and both list surfaces (`/api/lists`), plus
  chunked loading for connections.
- List hydration now fetches only the five cover games each card shows,
  instead of every item of every list.
- Every list-like empty state uses the designed icon-square pattern.

## Done in the perceived-speed pass (July 2026)

- Profile page split into streamed sections: header and stats render from
  quick head counts while the shelf, activity, and lists asides resolve
  behind their own `<Suspense>` with silhouette skeletons.
- Optimistic updates on follow and library actions (status, playing, backlog,
  wishlist, liked, rating): the UI flips immediately, reconciles with the
  RPC's canonical state, and reverts on error.
- Game logs page paginated: header totals come from a lightweight scan of all
  sessions and the hydrated stream loads 30 at a time.

## Next: polish and correctness

1. **Profile subpage counts.** The connections page still loads every follow
   id to render tab counts; move to head counts plus keyset pagination on the
   follows table itself.
2. **Search users and lists.** Global search only returns games today.
3. **Error telemetry.** `error.tsx` logs to the console only; add a reporting
   endpoint so production errors are visible.

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
