# uloggd roadmap

Complements [the backlog](backlog.md). The backlog holds product decisions
still under discussion; this roadmap records what each pass of engineering
actually changed, oldest first, and ends with what is next. Updated September
2026 after the moderation pass.

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

- A profile can declare that it represents an organization, a store, studio,
  publisher, outlet, or community, through `profiles.account_type`, with an
  optional 60-character tagline. Registration is open; the verified badge stays
  a separate moderation decision, and the editor says so.
- Modelled beside `role`, not inside it. `role` is the permission ladder and
  `moderate_account` refuses when `actor_role = 'MODERATOR' and target_role <>
'USER'`, so an ORGANIZATION role would have put every organization out of
  ordinary moderators' reach, the account type most exposed to impersonation,
  since anyone may register one.
- Moderation can revoke a claim with `DEMOTE_ORGANIZATION`: the account returns
  to a person and the tagline clears, the account itself survives, a reason is
  required, and it is recorded as `USER_ORG_REVOKED`. The console shows the
  account type on the user card.
- The mark appears on the profile, in quick search, the activity feed,
  connections, and people search. It is deliberately neutral: the claim is
  self-declared, so it must not read like the verified badge.

## Done in the privacy and coverage pass (July 2026)

- Private profile columns are revoked from `anon` and `authenticated`: birth
  date, the age assurance trail, and `role`. Row-level security cannot restrict
  columns, so `profiles_public_read` had been exposing all of them since the
  schema's first migration. Reads go through `own_age_profile()`,
  `own_account_role()`, and two moderation console functions gated on
  `private.is_moderator()`.
- The private library setting is enforced by the database. `user_games` carried
  a `using (true)` policy alongside the one that checks `library_visibility`,
  and permissive policies combine with OR, so the careful one never decided
  anything.
- Blocking holds on journeys, which had the same blanket policy.
- Database-layer tests (`npm run test:db`): column privileges, RLS visibility,
  notification delivery, blocking, and library privacy, run as `anon` and
  `authenticated` inside rolled-back transactions.

## Done in the PWA pass (August 2026)

- Installable with a manifest, icons including a maskable variant, shortcuts,
  and theme colours for both schemes.
- A hand-written service worker: navigations network-first with a cached
  offline page as fallback, content-hashed build assets from cache, everything
  else untouched. `/sw.js` is served with no-store so a bad worker stays
  fixable.
- Not yet confirmed working on the live domain, which sits behind Cloudflare.

## Done in the push pass (August 2026)

- Web push end to end: a `push_subscriptions` table scoped to its owner, a
  `pg_net` trigger on `notifications` that calls the app with only a row id, a
  dispatch route that loads the rest with service credentials and drops
  subscriptions the push service has retired, and `push`/`notificationclick`
  handlers in the service worker.
- Consent is asked from a click and never on load, per device, and the card
  explains itself when the browser cannot do push at all.
- Inert until provisioned: no keys means the route no-ops, the trigger finds no
  config, and the card does not render. See [Web push](../operations/web-push.md).
- A notification opens the item, not the feed: `notifications` stores an
  internal id and every route is addressed by a public one, so the dispatch
  route resolves it per kind, including the comment anchor. Every kind was
  resolved against real rows and each resulting URL requested against a
  production build.

## Done in the organization fields pass (August 2026)

- An organization states a category from a fixed list (store, studio,
  publisher, outlet, community, other) and an official website. Until then the
  claim was a flag and a tagline, which says an account is not a person and
  nothing else.
- The category replaces the generic word on the profile, since "Store" tells a
  visitor more than "Organization" does and cannot be written into by the
  account itself.
- The website is https-only, validated in the function and by a constraint, and
  rendered with `rel="noopener noreferrer nofollow ugc"`. A bare domain is
  completed rather than refused.
- A trigger keeps the fields and the account type consistent for every writer,
  because the moderation revocation path knows nothing about the new columns
  and the constraint would otherwise have rejected every demotion.

## Done in the organization pass (August 2026)

- Members: an organization lists the people who hold it, publicly. Only the
  account adds them; anyone can remove themselves. Being listed does not grant
  posting as the account, and the card says so.
- Category, official website, and a link to a catalogue company that the
  company page only shows once a moderator has verified the account.
- The verified mark reaches share cards, and push notifications carry the
  actor's avatar.

## Done in the screenshots and privacy pass (August 2026)

- Screenshots moved off Supabase Storage to imgchest, and the storage column,
  policies and signing calls are gone. All user images are on imgchest.
- A screenshots workspace at `/shots/[username]` with the same filters, hero
  and pagination as reviews, reachable from the sidebar on both desktop and
  mobile. The old gallery redirects to it from the proxy.
- The library gained followers-only, honoured by the read policy rather than
  only by the interface.
- People can like their own posts.

## Done in the moderation pass (September 2026)

- Moderation can act between doing nothing and taking an account away: a
  warning writes an infraction, enters the audit log and reaches the person's
  inbox, and the account keeps working.
- A ban and an unban say so in the inbox too. Every notice reads as
  "Moderation" rather than as the moderator who took it.
- Reviews, sessions and lists can be taken down. Only comments and screenshots
  had a removal function before, so the answer to an account posting spam
  reviews was to ban it and leave the reviews up.
- The removal control asks the layout whether the reader is staff instead of
  being handed a prop, so it appears wherever a post is drawn: feeds, cards,
  comments, galleries and detail pages, rather than on three pages.
- The console's account panel lists everything an account has posted, labelled
  by kind, and removes any of it without waiting for a report about that exact
  piece.
- Taking a screenshot down was broken outright: its notification kind had
  fallen out of the inbox's check constraint, so the removal died on the insert
  and rolled back. The constraint is restated whole, with a test that walks the
  list in the migrations.
- The suspended account's screen leads with how long is left, counting down,
  then why, what the suspension does and does not touch, and an appeal that
  already carries the handle.

## Done in the account type removal (September 2026)

- The organization account type is gone: the tagline, category, website,
  claimed company slug, team of members, the mark beside the name, the console
  action that revoked it, and the columns, enums, table, trigger and functions
  behind them. One account ever used it. See [the backlog](backlog.md#6-organization-accounts-closed).

## Done in the search pass (September 2026)

- Changing the kind of search stops rendering the page again: the scope is read
  in the browser, so reviews, lists, tierlists, people and companies swap
  themselves. Games still fetches, because its filters carry lists read from
  IGDB.
- Every scope waits the way the catalogue does, in the shape of the card that
  replaces it, with the same loading line over the results.
- A list result says whose list it is, and the heart on a card counts likes
  instead of looking like one the reader had given.

## Done in the hosting pass (September 2026)

- The data cache lives in memory behind a handler with a ceiling and an
  eviction order. Next writes every cached fetch to disk and never removes one,
  and the catalogue reads IGDB through `unstable_cache`: the container ran out
  of disk, and every render then failed writing the next entry.
- A game in a list can be ticked off as done: the cover fades, keeps a check,
  and the list says how far along it is.

## Done in the profile pass (September 2026)

- A company page says what the company is beside what it made: the catalogue is
  read once for a timeline, its genres and its platforms, and the rail carries
  the facts, the community's score and the mix.
- Turning a status off gives the game back what it was. The card's two toggles
  had to name a replacement when they were switched off, and the only one an
  interface could name was BACKLOG, so a finished game marked as being played
  again came back as backlog. The row remembers now, and finishing a game
  leaves a date that playing it again does not unmake.
- A cover in an auto-scrolling showcase grid opens its game. The strip took
  pointer capture the moment a pointer went down, which sends the click that
  follows to the strip rather than to the cover: every tile could be dragged
  and none of them went anywhere. It also stays still while the pointer rests
  on it after a drag.
- Somebody's lists sit under their activity rather than in a rail beside it,
  five of them, collections and tierlists together, with a way to the rest.

## Done in the playthrough pass (September 2026)

- **Playlog.** A session you open rather than a form you fill in: one press to
  start, a bar in the shell that survives navigation, quick notes while it
  runs, and a timeline on the entry afterwards. Designed and then built in
  [playlog.md](playlog.md).
- **A journey is a playthrough.** It carries its situation, dates, difficulty,
  progress, replay and mastered, and points at the copy it was played on.
  Platform, edition, medium, ownership and storefront live on that copy, which
  is a `library_entries` row: see
  [playthroughs.md](../architecture/playthroughs.md).
- **A run is as visible as what is inside it.** `journeys_read` was public
  whatever the sessions under it said, and `journey_overview` kept that hole
  for a while longer because a definer function answers on its own terms.
- **Playing and played are two facts.** Marking a game as played no longer
  switches off "I am playing this", which is the one case a replay needs.
- **A weighted community score**, for ranking, beside the plain average, for
  showing.
- **The numbers**, at `/u/:username/stats`: everything somebody has played,
  counted in the database rather than added up in the page.
- **Series progress** on the game page, with the normalisation policy written
  down in `lib/series-policy.ts`.

## Done in the depth pass (September 2026)

- **Copies are a feature**, not a column: a card in the game's rail, create,
  edit, delete, several per game, and an upsert that does not make a second
  identical row every time somebody says "PS5".
- **A run picks a copy** rather than a platform of its own, and can go back to
  saying it does not know.
- **The playlog writes all four kinds.** "Parei aqui" writes a stop, the next
  session of that run opens knowing where it was left, and a screenshot is one
  press through the pipeline screenshots already had.
- **Series progress counts variants.** A remake, a remaster, a port or an
  edition satisfies the slot of the game it came from, a variant no longer
  takes a slot beside the game it is a variant of, and the panel says both
  "played" and "finished".
- **The numbers know about copies and runs**: physical and digital, ownership,
  storefronts, and how runs ended, each one only once there is enough of it to
  mean something.
- **Session tags were considered and closed**, with the reasoning in
  [backlog.md](backlog.md).

## Done in the closing pass (September 2026)

Every one of these is model, API, interface and tests, not a column waiting
for a screen:

- **Copies are navigable**, not only editable: the library counts by copy as
  well as by game, with facets for platform, medium, ownership and storefront,
  and says which games are owned on more than one platform.
- **Editions reach the series.** IGDB states a version on the edition, not on
  the game, and most editions are not main games, so a listing of a collection
  never contained them: somebody who owns only the Game of the Year Edition
  was told they had not played the game.
- **The copy panels on the numbers page** opened at three classifications
  rather than three copies, and one copy fills three of them.
- **A list item is painted, not completed.** The tick that meant "done" is a
  colour or a dimming whose meaning belongs to the author, the counter is
  gone, and the fourteen marks that existed came across as dimmings.

## Done in the core completion pass (September 2026)

The four things a shelf this size could not do, and the reads behind them:

- **The copies view asks the server.** The page, the order, the filters, the
  search and the counts are a query now: it used to read the whole shelf and
  filter it in the browser, which works for twenty copies and for nobody with
  two thousand. It pages by cursor rather than by offset, because a shelf
  changes while you walk it, and the cursor carries the sort key beside the
  row's id: two copies recorded in the same second share a timestamp, and the
  key comes back from Postgres as text, since the driver rounds microseconds
  to milliseconds and a cursor rounded that way returns an empty second page.
- **The numbers say what the shelf is made of.** Genres, studios and
  publishers are not in the database, so the read carries the visible ids and
  the catalogue is asked once for the rest. Counted by game with the hours
  beside them, because "a third of my games are RPGs" and "a third of my
  hours" are different sentences and only one survives a single
  four-hundred-hour save file.
- **The library is seen as the series it is made of.** Six of them, in two
  requests however large the library is: the shelf is grouped first and only
  the series it really holds are asked about. Every entry is drawn, not only
  the owned ones, and an entry nobody can play any more can be set aside: it
  leaves the denominator and stays in the row.
- **Lists have folders.** A heading over the owner's own lists and nothing
  else: no visibility of its own, and deleting one leaves the lists standing.
  A folder is visible only when a list inside it is.

## Next: polish and correctness

1. **Error telemetry storage.** `/api/telemetry` only logs; consider a
   Supabase table with retention if log scraping proves insufficient.
2. **Follow graph and blocking.** A blocked account can still read the
   blocker's followers. Hiding it means changing the policy follower counts are
   computed from, so it is a product decision with real blast radius.

## Later: features

1. **List collaboration.** Shared lists with invited editors.
2. **Steam import.** The Backloggd importer is done and serves as the model.

## Release gate

Same as the backlog: PT/EN copy, responsive loading/empty/error states,
keyboard and screen-reader behavior, theme coverage, and Playwright checks.
