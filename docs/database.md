# Database architecture

uloggd uses Supabase for PostgreSQL, Auth, Storage, Realtime, and row-level security. Prisma is the typed server-side ORM and migration source of truth.

## Connections

- `DATABASE_URL`: Supavisor transaction pooler on port 6543. Used by the application at runtime.
- `DIRECT_URL`: Supavisor session connection on port 5432. Used only by migrations, introspection, and administrative database scripts.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: safe to use in the browser with RLS enabled.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only administrative access. It must never be imported by a Client Component or exposed with a `NEXT_PUBLIC_` prefix.

## Data ownership

IGDB remains the game catalog source. uloggd stores only `igdb_id`, `game_slug`, and user-generated data such as library status, reviews, lists, follows, blocks, and reports.

Supabase Auth owns identities in `auth.users`. `public.profiles.id` references `auth.users.id` with cascade deletion. A database trigger creates the public profile after signup.

## Commands

```sh
npm run db:check
npm run db:generate
npm run db:migrate -- --name migration_name
npm run db:deploy
npm run db:studio
```

On Android/Termux, Prisma's native migration engine is unavailable. Use the checked-in SQL runner instead:

```sh
npm run db:apply
```

The runner uses `DIRECT_URL`, a PostgreSQL advisory lock, transactions, SHA-256 checksums, and Prisma's `_prisma_migrations` table. Migrations applied through it remain compatible with `prisma migrate deploy` on supported Linux deployment environments.

## Authorization boundary

RLS protects requests made through the Supabase Data API with the signed-in user's JWT. Direct Prisma connections do not automatically carry that JWT, so every Prisma mutation must verify the authenticated user and scope its query explicitly by `profileId`.

Use:

- `lib/supabase/client.ts` in Client Components.
- `lib/supabase/server.ts` in Server Components, Route Handlers, and Server Actions.
- `lib/supabase/admin.ts` only for trusted administrative operations.
- `lib/prisma.ts` for authorized server-side relational queries.

## Migration rules

1. Edit `prisma/schema.prisma`.
2. Generate and review a migration on a supported platform when possible.
3. Add grants, RLS policies, constraints, and triggers to the SQL migration.
4. Never use `prisma db push` against production.
5. Run `npm run db:check`, Prisma validation, lint, and the production build before deployment.
