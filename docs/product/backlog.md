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

## Release gate

Every item requires Portuguese and English copy, responsive loading/empty/error
states, keyboard and screen-reader behavior, theme coverage, database policy
tests, and Playwright geometry checks before release.
