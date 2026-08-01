# uloggd

A game journal and community: log the sessions you play, write reviews, keep a
library and lists, and follow what other people are playing.

Built with Next.js (App Router), Supabase/PostgreSQL, and IGDB for catalogue
data. The interface ships in Portuguese, English, and Spanish, and installs as
a PWA.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Most of the app needs a `.env.local` with Supabase credentials and an IGDB
(Twitch) client before it does anything. `npm run db:check` reports what the
database is missing.

> **On this project's Next.js version:** APIs and file conventions differ from
> older releases in ways that matter. Read the relevant guide under
> `node_modules/next/dist/docs/` before writing framework code, rather than
> relying on memory. More than one bug here came from not doing that.

## Scripts

| Command             | What it does                               |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Development server                         |
| `npm run build`     | Production build                           |
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
| [docs/database.md](docs/database.md)                                         | Schema setup and migration workflow          |
| [docs/ROADMAP.md](docs/ROADMAP.md)                                           | What is built, and what is next              |
| [docs/product-backlog.md](docs/product-backlog.md)                           | Product decisions still open                 |
| [docs/push-setup.md](docs/push-setup.md)                                     | Provisioning web push                        |
| [docs/backloggd-import.md](docs/backloggd-import.md)                         | Partner allowlisting and import diagnostics  |
| [docs/legal-review.md](docs/legal-review.md)                                 | Legal review notes                           |
| [docs/profile-data-exposure-notice.md](docs/profile-data-exposure-notice.md) | Draft user notice for the July 2026 exposure |
