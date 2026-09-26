# Playlog: a session you open, not a form you fill in

**Status: the data model is built and tested. The interface is not.**

`supabase/migrations/20260926000100_play_sessions.sql` and
`tests/db/play-sessions.test.mts`. What is left is the open-session bar,
the event composer and the timeline.

Today a journal entry is written after the fact. You stop playing, you open a
form, and you try to remember what happened: how long it was, what you did,
which screenshot went with which moment. The form asks for a finished account
of a thing that is already over.

The proposal is the other way round. You open a session when you start
playing, and you add to it while you play: a note, a screenshot, where you got
to, "parei aqui". When you close it, what you added is already the entry, and
the game's page has a timeline of them.

## The decision this rests on

**A live session is an open diary entry, not a new kind of post.**

Everything downstream of `diary_entries` already works: the feed draws them,
the year retrospective counts them, journeys group them, they can be liked,
commented on, reported and moderated, and the public API serves them. A second
post type would need all of that again, and would leave every reader asking
what the difference is between a session and an entry.

So a session is an entry that has been opened and not yet closed, plus a table
of the things added to it while it was open. Closing one produces exactly the
row the composer produces today.

## What exists now

`diary_entries` already carries most of the shape:

| Column                        | Note                                                    |
| ----------------------------- | ------------------------------------------------------- |
| `played_on`, `ended_on`       | `date`, so a session across midnight is expressible     |
| `minutes`                     | nullable, 0–100000                                      |
| `started_at`                  | `time without time zone` — a wall clock, not an instant |
| `note`                        | `varchar`, capped at 1000 characters                    |
| `marks_start`, `marks_finish` | the "began it" / "finished it" markers                  |
| `journey_id`                  | the named playthrough it belongs to                     |

`diary_entry_images` already attaches images to an entry in a given order, so
pictures inside an entry are not new ground.

Two of those are why this needs new columns rather than reuse:

- `started_at` is a **wall-clock time with no date and no zone**. A live
  session has to know the instant it began to say how long it has been going,
  and a `time` cannot answer that across midnight or across a device.
- `note` is **one field of 1000 characters**. A running log is a list of
  moments, each with its own time, and flattening it into one string loses the
  ordering that makes it a timeline.

## Data model

```sql
-- On diary_entries: the instant a live session began, and nothing else.
-- Null for every entry written the way they are written today, which is what
-- keeps this change invisible to everything that already reads this table.
alter table public.diary_entries
  add column if not exists open_since timestamptz;

-- One partial unique index: a person may have one session open at a time.
-- Not one per game. Two open sessions is a state nobody meant to be in, and
-- the "which one am I adding to" question has no good answer in the interface.
create unique index if not exists diary_entries_one_open_per_profile
  on public.diary_entries (profile_id) where open_since is not null;

create table public.diary_entry_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries(id) on delete cascade,
  -- Denormalised for the row policy, the way diary_entry_images already does
  -- it: a policy that has to join to find the owner is a policy that gets
  -- written wrong once.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('NOTE', 'SHOT', 'PROGRESS', 'STOP')),
  -- What was said. Null for a SHOT with no caption.
  body varchar(500),
  -- Where they got to, for PROGRESS: free text, because "chapter 4", "60%"
  -- and "beat Ganon" are all answers people give and none of them is a number.
  marker varchar(80),
  screenshot_id uuid references public.screenshots(id) on delete set null,
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

Four kinds, because four is what the idea named:

- **NOTE** — a line of text.
- **SHOT** — a screenshot. It is a real row in `screenshots`, so it keeps its
  own page, its own likes and its own moderation, and the event points at it.
  A picture taken during a session is not a lesser picture.
- **PROGRESS** — where you got to.
- **STOP** — "parei aqui", which is a note with a different weight: it is the
  one a reader looks for, and the one the next session starts from.

`at` is the event's own instant rather than its insert time, so an event added
five minutes late can still say when it happened.

## The lifecycle

```
                 open                    add events                close
   (nothing)  ──────────▶  open entry  ◀────────────▶  open entry  ──────▶  entry
                           open_since                                        open_since = null
                           set                                               minutes set
                                                                             played_on / ended_on set
```

**Opening** inserts a `diary_entries` row with `open_since = now()`,
`played_on = current_date`, no `minutes`, and the visibility the person
usually posts at. An open entry is **not** in the feed: it is a draft with a
clock on it, and a post that appears before it says anything is a post nobody
can read.

**Closing** computes `minutes` from `open_since` to now, rounded, and offers
it for editing — the clock is a suggestion, not a claim, because people leave
a game paused, go to lunch, and know it. It sets `ended_on` when the session
crossed midnight, clears `open_since`, and from that moment the row is an
ordinary entry that the feed, the year and the journey all pick up.

**Abandoning** is closing with no events and no minutes: the row is deleted
rather than posted. A session someone opened and forgot is not a thing they
did.

A session open for more than, say, 16 hours is almost certainly forgotten
rather than heroic. The close should say so and suggest a duration rather than
recording a day and a half.

## What the reader gets

The timeline is the events of an entry, in `at` order, under the entry's own
note. On the game's page, the entries of a journey in order **are** the
timeline of that playthrough: this is the part of the idea that needs no new
screen, because journeys already group entries and the events simply give each
one an inside.

## Where this leaves journeys

Journeys stay exactly as they are: a named playthrough that entries belong to.
A session opened while a journey is active joins it, which removes the one
piece of bookkeeping the current composer asks for and nobody enjoys.

The idea that "the journey is only a record" is answered by giving its entries
an inside, not by replacing the journey with something else.

## API

| Route                                       | Does                                              |
| ------------------------------------------- | ------------------------------------------------- |
| `POST /api/v1/journal/sessions`             | Opens one. 409 if one is already open.            |
| `GET /api/v1/journal/sessions/open`         | The open one, with its events. Powers the bar.    |
| `POST /api/v1/journal/sessions/{id}/events` | Appends an event.                                 |
| `PATCH /api/v1/journal/sessions/{id}`       | Closes it, with the minutes the person confirmed. |
| `DELETE /api/v1/journal/sessions/{id}`      | Abandons it.                                      |

Writes go through `security definer` functions like every other write here, so
the ownership check is in the database rather than in the route.

## What this deliberately does not do

- **No timer that runs in the browser.** The instant is in the database;
  anything on screen is arithmetic on it. A timer in a tab is a timer that
  stops when the tab does.
- **No automatic detection of what you are playing.** Steam presence already
  exists and could offer to open a session, but offering is the most it should
  do. A journal that writes itself is a journal nobody trusts.
- **No second feed.** An open session is invisible until it is closed.

## The questions, answered

These were left open in the first draft. Each is now decided, and the
decision lives in the migration beside the thing that enforces it.

1. **One open session at a time, not one per game.** One per game sounds
   more flexible and makes "add to the session" ambiguous the moment two are
   open: every event would need a target picker, and being quick is the whole
   point. Somebody alternating between two games in an evening closes one and
   opens the other, which costs two presses and leaves two honest entries
   instead of one guess.

2. **A screenshot keeps its own visibility, defaulted from the session.** It
   is a real row in `screenshots` with its own page and its own moderation,
   so it must keep its own column. But somebody who opened a private session
   does not expect its pictures to be public, so the session's choice is what
   the field starts at.

3. **An open session does not survive a day.** Closing without confirming a
   duration uses the elapsed time capped at sixteen hours, because a session
   open longer than that was forgotten rather than heroic, and recording a day
   and a half of play is worse than recording an hour too few. The cap is in
   the database, so no caller can write a number nobody could have played.

4. **Closing posts, and confirms the duration in the same step.** Two steps
   would be one more press on the thing this exists to make quick, but the
   duration does need confirming, because the clock is a suggestion: people
   leave a game paused and go to lunch, and they know it.

## What the build turned up

Three things the design could not have known, each now a test:

- **A definer helper outranks a policy.** Hiding open entries in
  `diary_visible_read` was not enough: `diary_entry_visible` is
  `security definer`, so the events and images of an open session stayed
  readable by anybody while the session itself was not. The helper had to
  learn the rule too.
- **A composite-returning function hands back a row of nulls** when it has
  nothing, which every caller reads as "there is a session, and it has no
  id". `own_play_session` returns `setof` for that reason.
- **No browser role may write `open_since`.** That is the point of the
  definer functions, and it means even the test cannot backdate a session as
  the person whose session it is.

## Staging

1. The migration and the definer functions, with database tests: opening
   twice, closing, abandoning, and the row policies on events.
2. The open-session bar: what the person sees while one is open, and the two
   controls that matter, "add" and "close".
3. The timeline on the entry, then on the journey.
4. Then, and only then, anything that opens a session for you.
