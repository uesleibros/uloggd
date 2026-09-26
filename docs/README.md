# Documentation

Four kinds of document, kept apart because they are read for different
reasons. Architecture explains how a thing works and why it was built that
way; operations is what you follow to run it; product is what is decided and
what is still open; legal is what has to be reviewed by somebody qualified.

The public API reference that a person actually reads lives at `/developers`
on the site itself, generated from `lib/docs/api-reference.ts`, not here.

## Architecture

| Document                                     | About                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Database](architecture/database.md)         | Connections, who owns which data, the authorisation boundary, and the migration rules |
| [Public API](architecture/public-api.md)     | Why a key resolves to its owner, how scopes and versioning were chosen, what is built |
| [Playthroughs](architecture/playthroughs.md) | What you played and what you played it on, and why they are two tables                |

## Operations

| Document                                           | About                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| [Web push](operations/web-push.md)                 | Generating the VAPID pair, the dispatch secret, and what the database sends |
| [Backloggd import](operations/backloggd-import.md) | Partner allowlisting and reading an import that went wrong                  |
| [spawnd catalogue](operations/spawnd-catalogue.md) | Refreshing the demo catalogue a game page plays from                        |

Deploying is in the [README](../README.md#deploy): it is the one operational
thing everybody needs, and a second copy of it would be the one that goes
stale.

## Product

| Document                      | About                                                               |
| ----------------------------- | ------------------------------------------------------------------- |
| [Roadmap](product/roadmap.md) | What each pass of work changed, oldest first, and what is next      |
| [Backlog](product/backlog.md) | Product decisions still open, and the gate a feature passes through |
| [Playlog](product/playlog.md) | A session you open rather than a form you fill in. Design only      |

## Legal

| Document                                                       | About                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [Review](legal/review.md)                                      | What needs qualified Brazilian counsel before launch       |
| [Profile data exposure](legal/profile-data-exposure-notice.md) | The July 2026 exposure: what happened and the draft notice |
