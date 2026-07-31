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

## 6. Organization accounts

Shipped as a self-declared account type; these are the decisions it left open.

- Define the dispute path: what evidence lets a brand reclaim a handle someone
  else registered, who adjudicates, and what happens to the squatter's existing
  content and followers. `IMPERSONATION` reports and `DEMOTE_ORGANIZATION`
  already exist, so this is policy rather than plumbing.
- Decide how person-shaped requirements should read for an organization. Note
  that relaxing the age gate for them would be a trivial bypass, since anyone
  may self-declare; the safe change is copy, the birth date belongs to the
  operator, not to the brand.
- Decide whether organizations should be discoverable as a filter, and whether
  their journeys, library, and wrapped pages make sense or should be hidden.

## Release gate

Every item requires Portuguese and English copy, responsive loading/empty/error
states, keyboard and screen-reader behavior, theme coverage, database policy
tests, and Playwright geometry checks before release.
