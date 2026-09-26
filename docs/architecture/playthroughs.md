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
