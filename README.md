# uloggd

A game journal and community. Log the sessions you play, write reviews, keep a
library, build lists and tier lists, share screenshots, and follow what other
people are playing. The interface ships in Portuguese, English and Spanish, and
installs as a PWA.

Built with Next.js 16 (App Router, React 19, Tailwind 4), Supabase and
PostgreSQL, and IGDB for catalogue data. It runs as a persistent Node server on
Square Cloud behind Cloudflare, not on a serverless platform, which is why a
few things here look unlike the usual Next deployment: a cluster of workers, a
shared request budget for the catalogue, and a data cache that stays in memory.

- [What is in it](#what-is-in-it)
- [Running it](#running-it)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Tests](#tests)
- [Architecture notes](#architecture-notes)
- [Deploy](#deploy)
- [Documentation](#documentation)
- [Licence](#licence)

## What is in it

- **A library and a journal.** Status, rating and playtime per game; sessions
  written into days, grouped into named journeys.
- **Reviews and lists.** Long-form reviews with aspect ratings and spoiler
  controls; collections and tier lists, orderable, shareable, and with games
  tickable off as you finish them.
- **Screenshots**, with spoiler covers and their own galleries.
- **A community.** Follows, blocks, comments on profiles and on posts, likes,
  a feed, and people discovery by shared taste.
- **Minerals and levels**, earned by using the site and sendable to other
  people.
- **Moderation.** Reports, a queue, warnings, suspensions, and removal of any
  post, comment or screenshot, each one audited and each one explained to the
  person it happened to.
- **A public API** at `/api/v1`, with keys, scopes and a reference at
  `/developers`.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Most of the app needs a `.env.local` before it does anything. Copy
`.env.example` and fill it in; `npm run db:check` reports what the database is
missing, and `npm run db:apply` applies the migrations in
`supabase/migrations`.

## Environment variables

`NEXT_PUBLIC_SITE_URL` is required and has no fallback: every canonical,
hreflang, sitemap entry and social card is built from it, so `lib/seo.ts`
refuses to load without it rather than shipping an empty origin.

Everything prefixed `NEXT_PUBLIC_` is **inlined into the client bundle at build
time**, not read at runtime. Setting one only in the Square Cloud panel has no
effect: it has to be present in the environment that runs `next build`, which
is why the deploy workflow carries them as Action secrets.

| Variable                               | What it is                                    |
| -------------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Public origin, e.g. `https://uloggd.com`      |
| `DATABASE_URL`                         | Supabase pooler, transaction mode (port 6543) |
| `DIRECT_URL`                           | Direct connection, migrations only (5432)     |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key                      |
| `SUPABASE_SECRET_KEY`                  | Service role key, server only                 |
| `TWITCH_CLIENT_ID` / `_SECRET`         | IGDB catalogue credentials                    |
| `STEAM_API_KEY`                        | Steam library import and presence             |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`       | Turnstile widget key                          |
| `TURNSTILE_SECRET_KEY`                 | Turnstile verification key                    |
| `IMGCHEST_API_KEY`                     | Where user images are stored                  |
| `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY`    | Web push signing pair                         |
| `VAPID_SUBJECT`                        | Web push contact, a `mailto:` URL             |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | The public half, for the browser              |
| `PUSH_DISPATCH_SECRET`                 | Shared secret for the `pg_net` dispatch call  |
| `BACKLOGGD_PARTNER_*`                  | Partner import allowlisting, see docs         |

`DATABASE_URL` must point at the Supabase pooler in transaction mode, because
the app runs as three persistent worker processes and a direct connection per
worker would exhaust the database's connection limit. `DIRECT_URL` bypasses the
pooler and is used only by `db:apply` and the database tests, which need
session-level features the pooler does not carry.

## Scripts

| Command                  | What it does                               |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Development server                         |
| `npm run build`          | Production build                           |
| `npm run package:square` | Square Cloud deploy tree                   |
| `npm run lint`           | ESLint                                     |
| `npm run db:check`       | Reports pending migrations and schema gaps |
| `npm run db:apply`       | Applies pending migrations                 |
| `npm run test:unit`      | Unit tests; needs no credentials           |
| `npm run test:db`        | Database tests; needs `DIRECT_URL`         |
| `npm run test:e2e`       | Playwright end-to-end tests                |
| `npm run e2e:clean`      | Removes accounts a test run left behind    |

## Tests

Three layers, and each one exists because something got past the other two.

**Unit tests** cover pure logic and the seams where a mistake stays silent: the
service worker's caching rules, push notification wording checked against the
kinds the database will accept, placeholders checked against the grids they
stand in for, and source-level guards against selecting columns that have been
revoked or reaching the database from a page.

**Database tests** run statements as `anon` or `authenticated` with the JWT
claims set, which is what PostgREST does, so column privileges and row policies
are what actually gets exercised. Each test runs inside a transaction that is
always rolled back. That layer had no coverage until it produced two serious
defects in a row: every profile's birth date was world-readable for the
schema's entire life, and closing that broke every signed-in page. Both passed
TypeScript, ESLint and a production build, because none of those ever talk to
PostgREST.

**End-to-end tests** run Playwright against the real project, on desktop and on
a phone viewport. The signed-in specs create a throwaway account, act as it and
delete it afterwards; without `SUPABASE_SECRET_KEY` they skip rather than fail.
They need `DATABASE_URL` like the site does.

## Architecture notes

- **Authorisation lives in the database.** Row-level security policies and
  column privileges, rather than checks in page code. A page that forgets a
  check is then a rendering bug instead of a data leak.
- **Row-level security cannot restrict columns.** Anything that must stay
  private needs a column privilege or a `security definer` function; a policy
  alone will not do it.
- **Permissive policies combine with OR.** A `using (true)` policy left beside
  a careful one silently grants everything. Two separate leaks here had exactly
  that shape, so a blanket policy deserves suspicion.
- **Pages read through the API.** The website calls its own `/api/v1` rather
  than the database, so the surface an integration uses is the surface the site
  itself depends on. A unit test walks the imports and fails a page that
  reaches for `pg` or Supabase directly.
- **Notifications are written by triggers**, so there is no server request to
  attach to. Web push is delivered by a `pg_net` call from the database into an
  API route, carrying only a row id.
- **IGDB has one budget for the whole cluster.** Four requests a second, shared
  between workers over IPC, with `multiquery` folding up to ten questions into
  one request.
- **The data cache is held in memory.** Next writes every cached fetch to disk
  and never removes one; the catalogue's queries are unbounded, so that filled
  the container. `cache-handler.js` keeps them in memory behind a ceiling and an
  eviction order.

## Deploy

The target is a Square Cloud container: 4 vCPU, 3 GB, one persistent Node
process tree behind Cloudflare on `uloggd.com`.

`next.config.ts` sets `output: "standalone"`, which emits a self-contained
server at `.next/standalone`, but that folder carries neither `.next/static`
nor `public/`, so a deploy that skips them serves the site with no CSS and no
images. `scripts/package-square.sh` builds and assembles the tree correctly:

```bash
npm run package:square
```

That produces `square-deploy/`, with `server.js` at its root. That `server.js`
is not Next's: it is a `cluster` primary that forks three workers against
`.next/standalone/server.js` and respawns them on exit, because Next serves
requests single-threaded and would otherwise leave three of the four cores
idle. `squarecloud.app` points `MAIN` at it.

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds in CI and
commits the assembled tree with `squarecloudofc/github-action@v2`. It needs
`SQUARE_TOKEN` and `SQUARE_APPLICATION_ID` as repository secrets, plus every
`NEXT_PUBLIC_*` variable, for the inlining reason above.
`.github/workflows/e2e.yml` runs the checks on the same push and needs
`DATABASE_URL`, and `SUPABASE_SECRET_KEY` for the signed-in specs.

**Migrations go out before the code that stops needing the old shape.** A
column dropped while the running build still selects it takes the site down
until the deploy lands, which is a thing that has happened here.

> **On this project's Next.js version:** APIs and file conventions differ from
> older releases in ways that matter. Read the relevant guide under
> `node_modules/next/dist/docs/` before writing framework code, rather than
> relying on memory. More than one bug here came from not doing that.

## Documentation

[`docs/`](docs/README.md) holds the longer documents, grouped by why you would
open one: [architecture](docs/README.md#architecture) for how something works,
[operations](docs/README.md#operations) for running it,
[product](docs/README.md#product) for what is decided and what is open, and
[legal](docs/README.md#legal) for what needs qualified review.

The API reference a person reads is generated from
`lib/docs/api-reference.ts` and lives at `/developers` on the site.

## Licence

[GNU General Public License v3.0](LICENSE).
