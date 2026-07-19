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

## Release gate

Every item requires Portuguese and English copy, responsive loading/empty/error
states, keyboard and screen-reader behavior, theme coverage, database policy
tests, and Playwright geometry checks before release.
