# Playthroughs and copies

Two ideas that were tangled together, separated: **what you played** and
**what you played it on**.

## The decisions

### A journey is a playthrough, and keeps its name

`journeys` already meant "one named pass through a game" and already owns the
diary entries and reviews that belong to it. It becomes the playthrough
officially, with the fields a run has, and it keeps its table name: renaming
it would rewrite every reader, every policy and every URL to say the same
thing in a different word.

Journey now means: **this particular experience I had with this game.**

### Nothing derived is stored

The brief asked a journey to carry total playtime, session count, last
activity, its review, its screenshots and its sessions. None of those are
columns here, because none of them are facts about the journey: they are
facts about the rows that point at it, and a copy of a sum is a sum that goes
stale the first time somebody edits a session.

They are computed, in one query, by `journey_overview`. That function is the
answer to "do not fetch ten thousand rows into the browser and add them up":
the aggregate happens in the database, for a page of journeys at a time.

| Asked for          | Where it actually lives                     |
| ------------------ | ------------------------------------------- |
| playtime total     | `sum(diary_entries.minutes)`                |
| number of sessions | `count(diary_entries)`                      |
| last activity      | `max(diary_entries.played_on)`              |
| review             | `reviews.journey_id`                        |
| screenshots        | screenshots of the game in the run's window |
| sessions / playlog | `diary_entries.journey_id`, in order        |

### Platform, edition, ownership and storefront belong to the copy

This is the one place the brief's two halves had to be reconciled. Section 1
asked for platform, edition, medium, ownership and storefront on the journey;
section 2 asked for a Library Entry that carries exactly those.

Putting them in both places would be two sources of truth for one fact, and
the first time somebody edited one the site would start disagreeing with
itself. So they live on the copy, and a journey points at one:

```
library_entries   what you own or have access to    PS5 · digital · PS Store · owned
      ▲
      │ library_entry_id (nullable)
      │
journeys          the run you had                   "Primeira run" · completed · 121h
```

A journey with no copy recorded is a run whose platform is simply unknown,
which is the honest state and the one every existing journey starts in.

Somebody who only wants to say "I played it on PS5" makes a library entry
with the platform set and everything else null. It is the same row,
minimally filled, which is what keeps this progressive rather than a form.

### `user_games` is untouched

It stays what it is: the game's **global** state for a person. Status,
liked, favourite, quick rating, custom cover, wishlist, backlog.

- `user_games`: "where does this game stand with me"
- `library_entries`: "which copies do I have"
- `journeys`: "what runs have I played"

Three questions, three tables, no overlap. A game can have one library row,
three copies and two playthroughs.

### Storefronts and ownership are constrained, not free text

A check constraint over the majors plus `OTHER`, because
"Steam"/"steam"/"STEAM " as three different answers makes every statistic
built on top of it wrong. `OTHER` exists so the list never blocks anybody,
and `note` is where the unusual case goes.

Ownership is `OWNED`, `SUBSCRIPTION`, `BORROWED`, `RENTED`, `SHARED`,
`PREVIOUSLY_OWNED`. Medium is `PHYSICAL` or `DIGITAL`. Both nullable,
because "I played it" does not require saying how you got it.

### Privacy follows the library

A copy says what you own, which is the same kind of fact as what is in your
library, so `library_entries` reads through the same rule `user_games` does:
the owner always, everybody else only if `library_visibility` lets them.

Journeys already read publicly, which predates this and is worth revisiting:
a journey's title is visible even when every session inside it is private.
That is not made worse here, and the copy a journey points at is not readable
through the journey.

## Migrating what exists

Every new column is nullable and every default is null. The eight journeys
that exist keep their titles and their sessions, gain no platform nobody
recorded, and their status is inferred once, from what their sessions already
say: a journey with a session that marks the game finished is `COMPLETED`,
one with sessions is `PLAYING`, one with none is `PLANNED`. Nothing else is
guessed.

## What reaches the interface

The columns existed for a while before anything could show them. What does
now:

- **The journey page carries the run.** Situation, platform, edition,
  difficulty, where it got to, replay, mastered, and a way to the review that
  came out of it. The owner edits all of it in one dialog where nothing is
  required, because a run with nothing filled in is the ordinary case rather
  than an unfinished form.
- **A platform is a copy.** Picking "PS5" in that dialog makes a
  `library_entries` row with the platform filled in and everything else null,
  and points the run at it. That is the smallest true thing somebody can say
  about how they played, and it is the same row a person who wants to record
  a Japanese physical special edition fills in the rest of.
- **`GET /api/v1/library/copies`** lists the caller's copies, a page at a time,
  with filters, a search, a sort and facet counts; `?game=` answers one game's
  copies whole and without a cursor, which is what a game's page asks. **POST**
  records one. Somebody else's copies are never read through these;
  they are read through the run that points at them, by the rule the owner's
  library visibility sets.

## The aggregate is the read

`journey_overview` answers about all of somebody's runs, or about one, and
either way it is one query: the sums, the session count, the last day played,
the review and the copy. A page reads it instead of pulling rows and adding
them up.

It is `security definer`, which is a thing worth saying out loud twice now: a
definer function answers on its own terms, so tightening `journeys_read` did
nothing for it until the same rule was written into it by hand. The rule is
that a run is as visible as what is inside it, and always visible to its
author. Any future definer function that reads `journeys` has to say so too.

## Copies, as a person meets them

The columns were reachable only through a run's platform picker for a while,
which meant seven of them were reachable by nobody. They are a card in the
game's rail now, beside the status and the rating, because they answer the
same question: where does this game stand with me.

- **One line while there is nothing**, a short list once there is, and
  everything past the platform behind "copy details". Somebody who only ever
  says "PS5" should not be able to tell the other seven fields exist.
- **A run picks a copy**, never a platform of its own. The chip on the run
  reads "PS5 · Digital · PlayStation Store": one chip, not one per field,
  because the fields belong to the copy and a run that restated them would be
  the second source of truth this whole split exists to avoid.
- **Saving is an upsert.** Asking for "PS5" when a PS5 copy is already
  recorded means that copy. Answering with a new row every time is how a
  library ends up with nine identical PlayStation 5 entries nobody asked for,
  so the API looks for one that matches the fields the caller actually named.
  `duplicate: true` forces a second one, because people do own two physical
  copies of one game.
- **Deleting a copy is not deleting the playing.** The runs played on it keep
  their sessions and lose the recorded platform, which is the honest state.
- **A run cannot point at a copy of another game.** The check used to stop at
  "is this the caller's copy", so "Resident Evil 4, played on my Skyrim
  cartridge" was something the database would accept.

## The shelf, counted by copy

The library answers "which games are mine". The copies view answers the other
questions about the same shelf: what is physical, what is on Steam, what is
only borrowed, and which games are owned more than once. A game appears once
per copy there, which is why it is a view and not a filter: the count of games
has to keep meaning games.

- **The server answers, not the browser.** The page, the order, the filters,
  the search and the counts are all a query. It used to read the whole shelf
  and filter in memory, which works until somebody has two thousand copies and
  then works for nobody. `lib/copy-browsing.ts` holds the decisions, free of
  the server, because a cursor that is not stable duplicates or drops rows and
  that is a bug nobody sees before their fourth page.
- **The cursor is the sort key and the row's id, together.** Two copies
  recorded in the same second share a `created_at`, and a cursor carrying only
  the timestamp either returns one of them twice or skips the other. Every
  `order by` therefore ends in `id`, and every comparison is written to match
  its own order rather than generated from it.
- **The key comes back from Postgres as text.** The driver hands a
  `timestamptz` over as a JavaScript Date, which keeps milliseconds where the
  column keeps microseconds. Sent back rounded, the cursor asks for rows older
  than an instant fractionally before every row, so the second page is empty
  and the shelf looks like it ends at twenty-four. There is a database test
  that pins exactly this, because the failure reads like an end and not like a
  bug.
- **A facet counts with the other filters applied and its own ignored.**
  Otherwise choosing a platform leaves every other platform reading zero and
  there is no way back out of the choice.
- **A platform is its catalogue id; the name is presentation.** The facet
  answers with both, and the address carries the id. Sending the name back was
  a filter the server could not honour, so picking "PlayStation 5" quietly
  returned the whole shelf. Two platforms that share a label stay two, one
  platform spelled two ways stays one, and a copy recorded before platforms
  had ids keeps its place in the results and its own group without pretending
  to be something anybody can filter by.
- **Every number on the screen is about the screen.** The totals, the two
  "more than once" counts and the size of each group are one aggregate over
  the same predicate the rows use, search included. It used to merge a
  filtered count with a whole-library one, so a shelf filtered to twenty-two
  Steam copies could say "of a hundred games".
- **A group is counted whole, not by the page.** Forty Steam copies say forty
  while the first twenty-four are on screen, and still say forty after
  loading more: the rows are paged, the count is an aggregate, and the cursor
  changes neither the totals nor the facets.
- **Two totals that look like one.** Games owned more than once counts rows;
  games owned on more than one platform counts distinct platforms. Somebody
  with two identical PS5 discs has the first and not the second, and calling
  that "on more than one platform" is simply untrue.
- **The view is in the address**, and every change pushes a history entry, so a
  filtered shelf can be reloaded, shared and walked back out of. The search box
  follows the address when it changes underneath it, instead of pushing its own
  old text back over the page somebody just walked to.
- **An entry can be set aside.** Some of a series cannot be played by
  anybody: a Satellaview broadcast from 1997, a phone game whose servers
  closed, a release that never left one country. Others simply are not wanted.
  Ignoring one takes it out of the denominator and leaves it in the row,
  faded and struck, because the gap is part of the series. It is not
  "dropped", which is about a game that was played, and it lives in its own
  table rather than as a flag on `user_games`: a library row means a game
  somebody keeps, and half of these are games they never will.
- **Ignoring is the reader's own, in both directions.** Nobody can read
  somebody else's, and nobody can add to it on their behalf. "Games I refuse
  to play" is a sentence about a person, and only they get to say it.
- **The press is the state.** Setting an entry aside changes the
  denominator, both bars, the "ignored" note and which game comes next, and
  all of it happens in the press. The reading stays on the server and the
  drawing moved to a client view beside it, which holds the set of ignored
  ids and recounts with the same pure functions the server uses.
- **Intent and truth are kept apart**, in `lib/toggle-sync.ts`: what somebody
  pressed is shown at once, what the server is known to hold is tracked
  separately, and one queue per game walks the difference away. Only one
  request is ever in flight for a game, and the target is read fresh each
  time round, so pressing twice while the network is busy ends where the
  second press asked rather than wherever the slower answer landed. A write
  that fails puts the mark back and says so. The button is never disabled:
  being unable to undo a press until the network answers is exactly what made
  this feel broken.
- **Reachable from an empty library.** The shelf is decided before the "your
  library is empty" state, because somebody who recorded a disc without putting
  the game in their library still owns the disc, and deciding it after is how
  that person loses the only view their rows appear in.

## Series equivalence

A separate policy, in `lib/series-policy.ts`, because it is a judgement and
judgements belong somewhere a test can reach them.

A remake, a remaster, a port and an edition are the same game arriving again,
so any of them satisfies the slot of the game they came from. A sequel, a
spinoff, a DLC and a standalone expansion are not, whatever they share a name
with. Nothing is inferred from a name, a year or a shared franchise: a wrong
equivalence is worse than a missing one, because it tells somebody they have
played something they have not.

The same pass folds a variant that IGDB also files as a main game into the row
it is a variant of, so a series of nine does not read as eleven.

## Global Series Progress workspace

The owner's Library has `?shelf=series` beside Games and Copies. Visitors stay
on the public games view, even if the URL asks for Series. The short summary
still selects up to six series with at least two held games and links to the
full view. The full candidate set requires one held game and has no series cap;
actual series must contain at least two canonical slots.

`GET /api/v1/library/series` requires `library.read` and uses only the verified
caller's profile id. It reads minimal library states and all ignored ids in one
owner transaction, then releases that transaction before reading IGDB. No
migration or new storage table is needed. The existing ignored read no longer
silently truncates at 500 ids.

`series-policy.ts` resolves explicit remake, remaster, port and edition relations.
DLC, expansions and sequels are not equivalent to a base game. `via` retains the
substitute's name, including editions not present among main games. Collection
and franchise ids use distinct keys. `series-shelf.ts` shares candidate selection,
progress arithmetic and classification; `series-view.ts` owns the serialized
view types and deterministic filtering/sorting/pagination.

Played means COMPLETED, PLAYING/playing, DROPPED or ON_HOLD. Merely holding a
game, BACKLOG and WISHLIST are not evidence of starting it. The next game is
the first nonignored, unstarted canonical slot in release order, including a
backlogged one. All includes all candidates, including all-ignored series.
Completed requires a positive denominator and every counted slot finished.
In progress requires at least one actually started slot and is not completed.
Ignore affects only the canonical slot id, removes it from the denominator and
next-up selection, and immediately updates counts, rows and classification.
The existing toggle queue reverts failed writes and preserves later presses.

The full response includes a compact global index of names and canonical id/state
pairs, plus at most six rows of cover/detail data. Additional pages request their
own keys in one API call; they never fetch each game or series separately. Global
counts are independent of search, filters and the visible page. Browser filters
use the index, while uncached page details use abortable requests. Search has a
300 ms debounce and immediate Enter; URL history keeps shelf/filter/q/sort/page,
including reload and Back/Forward. Progress ordering puts in-progress series
first, then unstarted and completed, breaking ties by finished fraction, started
count, name and stable key. Name ordering breaks ties by the same stable key.

IGDB memberships are deduplicated by kind/id and paged in stable id order, then
sorted by release date/id for display. Edition parent ids are deduplicated and
chunked by 100, with every edition page retained. `readSeriesPages` schedules
rounds of still-incomplete queries; the shared IGDB adapter packs ten queries
per multiquery request and uses its existing 12-hour Next cache and in-flight
sharing. Fields are limited to names, covers, release dates and explicit relations.
No new React cache or Supabase catalogue mirror is introduced. Failed/incomplete
catalogue reads throw on this endpoint, so a failure cannot claim an empty shelf.
The browser retains already read pages on transient errors and offers retry;
access denial clears retained private content.

Rows reuse the existing cover strips, DragScroll, Tooltip and Ignore controls.
States have icons and accessible names, and progress has readable totals. Loading,
true-empty, filter-empty, search-empty and retry states are localized in PT/EN/ES.
The full view hides the summary and avoids the regular all-game hydration request.
The layout follows the Library theme tokens and reduced-motion behavior.

The remaining upstream limitation is catalogue accuracy: missing or incorrect
explicit IGDB relations cannot be guessed from similar names. Cold reads of very
large libraries still need the complete compact membership index before global
counts can be truthful; subsequent detail pages reuse shared catalogue caching.
