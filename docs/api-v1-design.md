# Public API v1 — design

Nothing here is built. This is the shape to agree on first, because the
decisions that are expensive to undo are all in the first two sections.

## The constraint everything else follows from

This project keeps authorisation in the database. Row-level security policies,
column privileges and `security definer` functions decide what a request may
read and write, and every one of them answers `auth.uid()`. The README says it
plainly: a page that forgets a check is a rendering bug, not a data leak.

An API key has to preserve that. There are two ways to give a key request an
identity, and only one of them keeps the property.

**A key resolves to its owner, and the request runs as that user.** The key is
exchanged for a short-lived Supabase access token for the owner, and every
query goes through PostgREST exactly as the website's do. All 108 definer
functions, every policy and every column grant keep working untouched. A key
can never do something its owner could not.

**A key talks to the service role and the API checks permissions itself.** This
is the one to refuse. It moves authorisation out of the database and into
request handlers, which is the arrangement this codebase deliberately moved
away from after two leaks that had exactly that shape.

So: scopes narrow what a key may do; the database still decides what its owner
may do. A `library.write` scope on an account that cannot write to a private
list still cannot write to it. A scope is a ceiling, never a grant.

## What exists today

23 route handlers under `app/api`, and they are not an API. They are the
website's own endpoints: session-cookie authenticated, shaped around one screen
each, free to change whenever that screen changes.

| Route                               | Methods             | Session       |
| ----------------------------------- | ------------------- | ------------- |
| `/account`                          | DELETE              | yes           |
| `/activity`                         | GET                 | yes           |
| `/age/confirm`                      | POST                | no            |
| `/e2e/session`                      | POST                | harness only  |
| `/history/record`                   | POST                | no            |
| `/igdb/engines`, `/igdb/publishers` | GET                 | no            |
| `/igdb/games`, `/igdb/search`       | GET                 | yes           |
| `/imports/backloggd/*`              | GET, POST           | mixed         |
| `/journal/images`                   | GET, POST, DELETE   | yes           |
| `/lists`, `/lists/options`          | GET                 | yes           |
| `/profile/image`                    | POST, DELETE, PATCH | yes           |
| `/push/dispatch`                    | POST                | shared secret |
| `/screenshots`                      | POST, DELETE        | yes           |
| `/steam/*`, `/twitch/*`             | GET                 | yes           |
| `/telemetry`                        | POST                | no            |

None of them should become v1. Publishing them freezes the website's internals
as a contract. v1 lives at `/api/v1/*` as a separate surface, and these keep
changing freely.

## Resources and scopes

Scopes are named `<resource>.<read|write>`. A token carries a set, and the
middleware refuses anything outside it before the request reaches the database.

| Scope               | Covers                                        |
| ------------------- | --------------------------------------------- |
| `profile.read`      | the owner's profile, counts, level            |
| `profile.write`     | display name, bio, links, pronouns            |
| `library.read`      | `user_games`, play status, ratings            |
| `library.write`     | add, update and remove entries                |
| `reviews.read`      | the owner's reviews, public reviews of others |
| `reviews.write`     | create, edit and delete own reviews           |
| `journal.read`      | diary entries and journeys                    |
| `journal.write`     | log, edit and delete sessions                 |
| `lists.read`        | lists and tierlists, and their items          |
| `lists.write`       | create lists, add and reorder items           |
| `screenshots.read`  | own and public screenshots                    |
| `screenshots.write` | upload and delete                             |
| `social.read`       | followers, following, blocks                  |
| `social.write`      | follow and unfollow                           |
| `catalog.read`      | IGDB-backed game lookups                      |

Deliberately absent, and worth saying out loud rather than discovering later:

- No comment scope. Comments are the surface abuse arrives through, and a
  posting API is an abuse API. It waits until there is a reason for it.
- No moderation scope. Moderator powers are not delegable to a key.
- No account deletion. That goes through the second factor and a typed
  confirmation, and a key is neither.
- No scope reaches another user's private data. `social.read` returns who the
  owner follows, not those people's libraries.

`catalog.read` is the only scope that touches nobody's data, and it is the one
most people will actually want. It should be usable on a key that holds nothing
else.

## The key itself

```sql
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(60) not null,
  prefix char(8) not null,          -- shown in the interface, not a secret
  token_hash text not null unique,  -- sha256 of the full token
  scopes text[] not null default '{}',
  last_used_at timestamptz(6),
  expires_at timestamptz(6),
  revoked_at timestamptz(6),
  created_at timestamptz(6) not null default now()
);
```

- The token is shown once, at creation, and stored only as a hash. A listing
  shows the prefix and never more.
- `prefix` is what a person recognises their own key by, and what a leaked-key
  scanner can match on without holding the secret.
- `expires_at` is nullable, but the interface should default to an expiry
  rather than to forever.
- Row-level security: a row is readable and writable by
  `profile_id = auth.uid()` and nobody else. `token_hash` is revoked from
  `authenticated` entirely, and lookup happens inside a definer function, so a
  stolen publishable key cannot enumerate hashes.

Format: `ulg_live_` followed by 32 url-safe characters. The prefix makes the
string recognisable in a log or a paste, which is what makes leak scanning
possible at all.

## The request path

```
Authorization: Bearer ulg_live_...
        |
        |- hash it, look up by hash in a definer function
        |- reject: unknown, revoked, expired
        |- reject: scope not on the key        -> 403 insufficient_scope
        |- rate limit, keyed on the key rather than the account
        |- mint a short-lived token for profile_id
        `- run the query through PostgREST as that user
```

Rate limiting already exists. `private.claim_rate_limit(action, allowance,
window)` is what the comment and follow triggers use, and it keys on
`auth.uid()`. It needs a variant keyed on a key id, or one noisy integration
spends its owner's website allowance and locks them out of their own account.

Suggested ceilings, per key: 600 reads an hour, 60 writes an hour, and
`catalog.read` separately at 1000 an hour since it costs IGDB rather than the
database. Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`
and `X-RateLimit-Reset`.

## Errors

One shape, always, including on 500:

```json
{
  "error": {
    "code": "insufficient_scope",
    "message": "This key cannot write to the library.",
    "scope": "library.write"
  }
}
```

`code` is stable and machine-readable. `message` is for a human reading a log
and is not a contract. The codes: `unauthorized`, `invalid_key`, `key_revoked`,
`key_expired`, `insufficient_scope`, `rate_limited`, `not_found`,
`invalid_request`, `conflict`, `internal`.

`rate_limited` carries `retry_after` in seconds, which the existing limiter
already computes and puts in its exception hint.

## Versioning

The version is in the path: `/api/v1/...`. Additive changes ship into v1;
anything that removes a field or changes its meaning waits for v2, and the two
run side by side while v1 is deprecated. A `Deprecation` header and a sunset
date, announced before either means anything.

`/api/v1/me` returns the key's identity and its scopes, so an integration can
tell what it is holding without guessing.

## What this does not change

The 23 existing routes stay where they are and keep answering the website. The
only change they need is negative: the middleware must not accept a bearer key
on them, so nobody starts depending on `/api/screenshots` as though it were
public.

## Order to build it

1. The table, its policies, the definer lookup, and key management in settings.
   Nothing public yet, but keys can be created and revoked.
2. `catalog.read` and `/api/v1/games`. One scope, no user data, and real
   feedback on the shape before it is expensive to change.
3. The read scopes, one resource at a time.
4. The write scopes, once the reads have been in use long enough to trust.
5. The public documentation, which cannot be written honestly before this
   point.
