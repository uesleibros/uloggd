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

## Done in the network/search pass (July 2026)

- Connections page no longer loads every follow id: tab counts are head
  counts, pages are keyset-paginated on `follows(created_at)` with the person
  embedded in one query, and searches filter server-side (capped at 60).
- Quick search surfaces users and public lists alongside games.
- Client error boundaries report to `/api/telemetry` so production failures
  reach the server logs.

## Done in the wrapped pass (July 2026)

- "Year in games" page at `/u/[username]/year/[year]`: hero for time logged,
  stat tiles (games, finished, sessions, reviews, average, busiest month), a
  sessions-by-month column chart with hover tooltips and an sr-only data
  table, game of the year by played time, top genres, share button, and
  year-to-year navigation. Aggregates respect RLS visibility. Entry tile on
  the profile stats nav.
- Dynamic Open Graph and X cards for each wrapped page, with games, sessions,
  logged hours, and reviews rendered into the shared image.

## Done in the profile safety pass (July 2026)

- Enforceable account blocking removes follows in both directions and prevents
  new follows, comments, notifications, and blocked social content reads.
- A Privacy settings tab controls who may comment and lists blocked accounts
  with an unblock action.
- Protected profile comments include follower-first defaults, database rate
  limits, length and control-character validation, owner/author deletion,
  reporting, notification preferences, RLS, and MFA mutation enforcement.
- Profile conversations support bounded reply trees, inline replies, author
  editing with an edited state, and soft deletion that preserves the thread.
- Textareas use content-driven sizing across review, diary, profile, list, and
  report composers, growing until a viewport-safe scroll limit.

## Done in the organization accounts pass (July 2026)

- A profile can declare that it represents an organization — a store, studio,
  publisher, outlet, or community — through `profiles.account_type`, with an
  optional 60-character tagline. Registration is open; the verified badge stays
  a separate moderation decision, and the editor says so.
- Modelled beside `role`, not inside it. `role` is the permission ladder and
  `moderate_account` refuses when `actor_role = 'MODERATOR' and target_role <>
  'USER'`, so an ORGANIZATION role would have put every organization out of
  ordinary moderators' reach — the account type most exposed to impersonation,
  since anyone may register one.
- Moderation can revoke a claim with `DEMOTE_ORGANIZATION`: the account returns
  to a person and the tagline clears, the account itself survives, a reason is
  required, and it is recorded as `USER_ORG_REVOKED`. The console shows the
  account type on the user card.
- The mark appears on the profile, in quick search, the activity feed,
  connections, and people search. It is deliberately neutral: the claim is
  self-declared, so it must not read like the verified badge.

## Next: polish and correctness

1. **Search keyboard navigation across sections.** Arrow keys only walk game
   results; extend the combobox index to the users and lists sections.
2. **Followers-you-know.** Connections could highlight mutuals first using the
   viewer's own follow graph.
3. **Error telemetry storage.** `/api/telemetry` only logs; consider a
   Supabase table with retention if log scraping proves insufficient.
4. **Organization mark in comments.** Comment authors come from
   `get_content_comments` and the profile thread function, both fixed
   `returns table(...)` shapes, so the account type is not carried there yet.

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
