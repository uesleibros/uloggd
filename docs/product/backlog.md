# uloggd product backlog

This backlog follows the stabilization pass completed in July 2026. Items are
ordered by dependency and deliberately stop short of implementation until the
product behavior and privacy rules are agreed.

## 1. Profile activity

- Decide which events belong in the public activity stream.
- Add pagination without duplicating or reordering entries.
- Define empty, loading, private, blocked, and deleted-content states.
- Keep reviews, diary sessions, lists, and follows visually distinguishable.

## 2. Journeys and session history

- Add journey summaries to profiles and game history.
- Define whether journey progress is manual, session-derived, or both.
- Add filters for active, completed, abandoned, and replay journeys.
- Preserve private session visibility in every aggregate.

## 3. Social discovery

- Define recommendation inputs and an explicit explanation for every result.
- Avoid exposing private libraries or inferred sensitive attributes.
- Add dismiss, mute, block, and report paths before recommendations ship.
- Measure usefulness without fabricating online or popularity signals.

## 4. Notifications

- Define event types, grouping, retention, and read state.
- Add per-category preferences before enabling delivery.
- Start with an in-product inbox; email or push requires separate consent.
- Rate-limit noisy events such as likes and follows.

## 5. Sharing

- Define stable Open Graph previews for profiles, lists, reviews, and journeys.
- Preserve spoiler gates and visibility rules in server-rendered metadata.
- Provide copy-link and native Web Share paths with equivalent feedback.
- Add revocation behavior for content changed from public to private.

## 6. Organization accounts (closed)

Removed in September 2026. A profile could declare itself a store, studio,
publisher, outlet or community, with a tagline, a website, a claimed company
slug and a team of members. One account ever used it, and it put a branch in
nearly every read that returned a profile.

The decisions it left open, about dispute paths for a claimed brand handle and
about how person-shaped requirements read for a company, are moot: there is one
kind of account again. Impersonation is still reportable, and a verified badge
is still what says an account is who it claims to be.

## 7. Session tags (closed, for now)

Backloggd puts custom tags on a play session: co-op, story, grind, boss,
sidequests. The question was whether uloggd should.

Not now, and the reason is that uloggd already answers it differently. A
session here is a **playlog**: a sequence of things that happened, each one a
note, a place reached, a picture or a stop. "Beat the tower boss" is an event
with a time on it. A tag saying `boss` is the same sentence with the sentence
removed, and having both would mean two vocabularies for one thing, asked for
in two places, disagreeing about the same session.

The other half of the case is filtering and statistics, and neither has a
demand yet. Nobody has asked to see their co-op sessions, and the numbers page
has categorical data it is not using (status, medium, ownership, storefront).
Adding a field to every session composer to feed a filter nobody has asked for
is how a fast flow becomes a form.

What would change this: somebody actually wanting to filter or count by a kind
of session that the events cannot express. If that arrives, tags belong on the
diary entry, personal to the author, applied from the playlog bar in one press
and never required.

## 8. Folders, and what a folder is not (closed: built)

Somebody with a hundred lists cannot find one, and the filters beside them
cannot help: they ask what a list is (ranking, tierlist, public), never what
it is for. A folder answers the second question in the owner's own words.

What it deliberately is not:

- **Not a second privacy control.** A folder carries no visibility. Filing a
  private list does not publish it and filing a public one does not hide it,
  because two privacy controls on one object is how people publish things by
  accident.
- **Not tags.** A list is in one folder or none. A list in three places at
  once is not filed, and several would be a different feature with a
  different interface.
- **Not a container.** Deleting a folder leaves the lists standing and
  unfiled. Tidying a shelf is not throwing out what was on it.

## What is finished, and what that means

"Finished" here means a person can use it: the model, the API, the interface
and the tests. A column nobody can edit is not a feature, and this list is
kept honest about that distinction.

| Thing                      | State                                              |
| -------------------------- | -------------------------------------------------- |
| Copies                     | Usable: game page, paged library view, API, stats  |
| Journey as playthrough     | Usable: editor, copy, dates, replay, mastered      |
| Playlog                    | Usable: four kinds, resume, timeline, run progress |
| Series progress            | Usable on a game and over a library, policy tested |
| Ignoring an entry          | Usable: it leaves the count and stays in the row   |
| Numbers                    | Usable: all-time, runs, copies, genres and studios |
| List folders               | Usable: chips, settings picker, API, policy tested |
| List visual markers        | Usable: colour, dimming, public rendering          |
| Session tags               | Closed, see above                                  |
| Starting a session for you | Not built, deliberately: see playlog.md            |

## Release gate

Every item requires Portuguese and English copy, responsive loading/empty/error
states, keyboard and screen-reader behavior, theme coverage, database policy
tests, and Playwright geometry checks before release.
