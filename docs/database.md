# Database architecture

uloggd uses Supabase for PostgreSQL, Auth, Storage, Realtime, and row-level security. SQL migrations in `supabase/migrations` are the schema source of truth.

## Connections

- `DATABASE_URL`: Supavisor transaction pooler on port 6543. Reserved for server-side PostgreSQL jobs that cannot use the Data API.
- `DIRECT_URL`: Supavisor session connection on port 5432. Used only by migrations, introspection, and administrative database scripts.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: safe to use in the browser with RLS enabled.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only administrative access. It must never be imported by a Client Component or exposed with a `NEXT_PUBLIC_` prefix.

## Data ownership

IGDB remains the game catalog source. uloggd stores only `igdb_id`, `game_slug`, and user-generated data such as library status, reviews, lists, follows, blocks, and reports.

Supabase Auth owns identities in `auth.users`. `public.profiles.id` references `auth.users.id` with cascade deletion. A database trigger creates the public profile after signup.

## Commands

```sh
npm run db:check
npm run db:apply
```

The runner reads timestamped SQL files from `supabase/migrations`, uses `DIRECT_URL`, a PostgreSQL advisory lock, transactions, and Supabase's `supabase_migrations.schema_migrations` history table.

## Authorization boundary

RLS protects requests made through the Supabase Data API with the signed-in user's JWT. Administrative operations use the server-only service role or tightly scoped security-definer database functions.

Use:

- `lib/supabase/client.ts` in Client Components.
- `lib/supabase/server.ts` in Server Components, Route Handlers, and Server Actions.
- `lib/supabase/admin.ts` only for trusted administrative operations.

## Migration rules

1. Add a timestamped SQL file to `supabase/migrations`.
2. Review grants, RLS policies, constraints, and triggers in the same migration.
3. Apply it with `npm run db:apply`; never make untracked production schema changes.
4. Run `npm run db:check`, lint, TypeScript, and the production build before deployment.
