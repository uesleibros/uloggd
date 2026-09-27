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

- `user_games` — "where does this game stand with me"
- `library_entries` — "which copies do I have"
- `journeys` — "what runs have I played"

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
- **`GET /api/v1/library/copies`** lists the caller's copies of a game and
  **POST** records one. Somebody else's copies are never read through these;
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
