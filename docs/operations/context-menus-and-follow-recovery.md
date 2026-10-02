# Context menus and follow recovery

## Interface

The site uses Base UI's context menu for right click, Shift+F10 and long press.
Its shared layer sits above dialogs, popovers and tooltips, including the account
dropdown and image viewer, so the clicked menu remains visible and interactive.
It offers navigation and clipboard actions for the clicked link, the existing
image viewer for image controls, and actions of the nearest content item.
Cards and detail pages declare their context with `data-context-kind`.
`data-context-link` and `data-context-action` expose existing links and buttons.
Nested items keep their own scope, so a profile menu does not collect actions
from all the cards and comments on that profile.

Actions reuse the original controls, including authenticated rendering,
pending states and deletion confirmations. Server authorization remains in the
existing routes. Password fields never offer copy or cut. Clipboard failures
show an in-app status message. Navigation rejects executable and local URLs.

Text links have a quiet underline before hover and the site's lilac accent on
hover or keyboard focus. Navigation tabs, shaped buttons, avatars and image
overlays retain their control styling. Game and card titles stay plain, including
on hover, to avoid repeating underlines in shelves. Their lilac hover remains;
author names and informational links retain the text link treatment.
The image action unwraps Next's optimized thumbnail URL and opens IGDB covers
at `t_original`, using the same resolver as the game page's cover viewer. Custom
uploads keep their original source URL.

Password setup includes localized hints for the password, confirmation and
email code fields. Textareas share `field-sizing: content` and the existing
`TextareaAutosizeManager` fallback. Screenshot descriptions and moderation
fields no longer override that policy with native manual resizing.

## Follow recovery from notifications

The operator script `scripts/restore-follow-notifications.ts` previews surviving
`follow` notifications for a username. `--apply` restores missing edges only.
An explicitly approved fallback list can be supplied with `--mutual PEER ...`
after `--apply`; preview uses the same arguments without `--apply`. Each name
must resolve uniquely to another account. Both directions are restored, existing
edges remain untouched, and list-only edges use the transaction timestamp because
their original dates are unknown.
A received notification means `actor_id -> recipient_id`. A notification in
another user's inbox whose actor is the target account means the outgoing edge.
The recipient's inbox is queried directly, not just the target account's inbox.

Inserts preserve the evidence timestamp and use conflict handling. When needed,
the follow notification trigger is disabled under a table lock in the same
transaction, then restored before commit. Foreign keys and mutation safeguards
stay active. This prevents notification insertion and downstream push dispatch.
Failures roll back both row changes and trigger changes. Unknown custom follow
triggers stop the operation for review.

On 2026-10-01 the operation was applied to `failipsss`, Filipe Garcia:

- Received follow evidence: `gabb`, `erick`.
- Outgoing follow evidence in those users' inboxes: `gabb`, `erick`.
- Four evidenced edges, all already present.
- Zero edges inserted and zero new notifications.

The query included all surviving dates, both incoming and outgoing notifications.
After reviewing that limitation, the user explicitly authorized the earlier
mutual list. The subsequent operation restored these ten accounts in both
directions: `uesleidev`, `ericoco`, `romeu`, `neutrico88`, `burridy`, `hemoji`,
`ichiromustdie` (ichiro), `snowcatboy` (Snow), `tatuboll` (Tatu), and `enzo`.
Twenty edges were inserted, the four evidenced edges were preserved, all 24
requested edges were verified, and zero new notifications were created.

The old `notify_follow_activity` trigger deletes the corresponding notification
when a follow is deleted. The surviving inbox is therefore not a complete
historical record of the connections removed by the old ban implementation.
Absent evidence cannot establish additional historical follows. Ban preservation
was fixed separately by `20261001000100_preserve_follows_on_ban.sql`.

## Validation

The production context menu spec covers navigation, copying, image viewing,
viewport collision handling, keyboard focus, touch activation, controlled input
editing, library writes, and author versus visitor comment actions. The company
fixture reproduces the catalogue's published and developed links.

The database regression creates temporary accounts, preserves their notification
evidence while removing their edges, then runs restoration twice. It verifies
the missing-edge path, notification contents and read state, evidence timestamps,
trigger re-enabling and idempotence. Temporary accounts are removed afterward.
It also deletes the evidence normally and verifies that the approved mutual
list restores both directions silently and remains idempotent.

Final production E2E validation, each spec separately with the port cleared:

- Context menus: 14 passed across desktop and mobile.
- Control feedback: 12 passed across desktop and mobile.
- Discovery: 24 passed across desktop and mobile.
- Signed-in flows: 24 passed, desktop repeated four times.
- Accessibility: 14 passed across desktop and mobile.

The follow-up on October 1 passed 20 context menu cases and 14 control feedback
cases across desktop and mobile in production builds. It covers clean person
headings, original cover resolution, menu layering, password hints and textarea
growth. TypeScript, full ESLint, unit tests (367 passed, one private image fixture
skipped) and the standard production build passed before the follow-up commit.
