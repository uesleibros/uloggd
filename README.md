# uloggd

A game journal and community: log the sessions you play, write reviews, keep a
library and lists, and follow what other people are playing.

Built with Next.js 16 (App Router, React 19, Tailwind 4), Supabase/PostgreSQL,
and IGDB for catalogue data. It runs as a persistent Node server on Square
Cloud behind Cloudflare, not on a serverless platform. The interface ships in
Portuguese, English, and Spanish, and installs as a PWA.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Most of the app needs a `.env.local` before it does anything. Copy
`.env.example` and fill it in; `npm run db:check` reports what the database is
missing.

## Environment variables

`NEXT_PUBLIC_SITE_URL` is required and has no fallback: every canonical,
hreflang, sitemap entry and social card is built from it, so `lib/seo.ts`
refuses to load without it rather than shipping an empty origin.

Everything prefixed `NEXT_PUBLIC_` is **inlined into the client bundle at build
time**, not read at runtime. Setting one only in the Square Cloud panel has no
effect: it has to be present in the environment that runs `next build`, which
is why the deploy workflow carries them as Action secrets.

| Variable                                | What it is                                    |
| --------------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                  | Public origin, e.g. `https://uloggd.com`      |
| `DATABASE_URL`                          | Supabase pooler, transaction mode (port 6543) |
| `DIRECT_URL`                            | Direct connection, migrations only (5432)     |
| `NEXT_PUBLIC_SUPABASE_URL`              | Supabase project URL                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Supabase publishable key                      |
| `SUPABASE_SECRET_KEY`                   | Service role key, server only                 |
| `TWITCH_CLIENT_ID` / `_SECRET`          | IGDB catalogue credentials                    |
| `STEAM_API_KEY`                         | Steam library import and presence             |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`        | Turnstile widget key                          |
| `TURNSTILE_SECRET_KEY`                  | Turnstile verification key                    |
| `IMGCHEST_API_KEY`                      | Where user images are stored                  |
| `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY`     | Web push signing pair                         |
| `VAPID_SUBJECT`                         | Web push contact, a `mailto:` URL             |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`          | The public half, for the browser              |
| `PUSH_DISPATCH_SECRET`                  | Shared secret for the `pg_net` dispatch call  |
| `BACKLOGGD_PARTNER_*`                   | Partner import allowlisting, see docs         |

`DATABASE_URL` must point at the Supabase pooler in transaction mode, because
the app runs as three persistent worker processes and a direct connection per
worker would exhaust the database's connection limit. `DIRECT_URL` bypasses the
pooler and is used only by `db:apply` and the database tests, which need
session-level features the pooler does not carry.

## Deploy

The target is a Square Cloud container: 4 vCPU, 3 GB, one persistent Node
process tree behind Cloudflare on `uloggd.com`.

`next.config.ts` sets `output: "standalone"`, which emits a self-contained
server at `.next/standalone` — but that folder carries neither `.next/static`
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

> **On this project's Next.js version:** APIs and file conventions differ from
> older releases in ways that matter. Read the relevant guide under
> `node_modules/next/dist/docs/` before writing framework code, rather than
> relying on memory. More than one bug here came from not doing that.

## Scripts

| Command             | What it does                               |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Development server                         |
| `npm run build`     | Production build                           |
| `npm run package:square` | Square Cloud deploy tree              |
| `npm run lint`      | ESLint                                     |
| `npm run db:check`  | Reports pending migrations and schema gaps |
| `npm run db:apply`  | Applies pending migrations                 |
| `npm run test:unit` | Unit tests; needs no credentials           |
| `npm run test:db`   | Database tests; needs `DIRECT_URL`         |
| `npm run test:e2e`  | Playwright end-to-end tests                |

## Tests

Unit tests cover pure logic and the seams where a mistake stays silent: the
service worker's caching rules, push notification wording checked against the
kinds the database accepts, and source-level guards against selecting columns
that have been revoked.

The database tests are the ones worth understanding. They run statements as
`anon` or `authenticated` with the JWT claims set, which is what PostgREST
does, so column privileges and row policies are what actually gets exercised.
Each test runs inside a transaction that is always rolled back.

That layer had no coverage until it produced two serious defects in a row:
every profile's birth date was world-readable for the schema's entire life, and
closing that broke every signed-in page. Both passed TypeScript, ESLint and a
production build, because none of those ever talk to PostgREST.

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
- **Notifications are written by triggers**, so there is no server request to
  attach to. Web push is delivered by a `pg_net` call from the database into an
  API route, carrying only a row id.

## Documentation

| Document                                                                     | About                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| [docs/api-v1-design.md](docs/api-v1-design.md)                               | Public API: scopes, keys and versioning      |
| [docs/database.md](docs/database.md)                                         | Schema setup and migration workflow          |
| [docs/ROADMAP.md](docs/ROADMAP.md)                                           | What is built, and what is next              |
| [docs/product-backlog.md](docs/product-backlog.md)                           | Product decisions still open                 |
| [docs/push-setup.md](docs/push-setup.md)                                     | Provisioning web push                        |
| [docs/backloggd-import.md](docs/backloggd-import.md)                         | Partner allowlisting and import diagnostics  |
| [docs/legal-review.md](docs/legal-review.md)                                 | Legal review notes                           |
| [docs/profile-data-exposure-notice.md](docs/profile-data-exposure-notice.md) | Draft user notice for the July 2026 exposure |
