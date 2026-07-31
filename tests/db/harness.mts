import { config } from "dotenv";
import pg from "pg";

/**
 * Exercises the database the way PostgREST does: as `anon` or `authenticated`,
 * with the JWT claims set, so column privileges and row-level security are the
 * ones actually being tested rather than the superuser's view of the world.
 *
 * This layer had no coverage, and it is where the two worst defects of the
 * project so far lived. Every profile's birth date was world-readable for the
 * schema's entire life, because RLS is row level and nobody checked what a
 * column grant allowed. Then closing that broke every signed-in page, because
 * PostgREST fails a whole request over one revoked column and no test called a
 * query as a real role. Neither could be caught by TypeScript or by a
 * production build.
 *
 * Every test runs inside a transaction that is always rolled back, so the
 * writes that prove a trigger fired never survive the test. It still runs
 * against a real database, which is the point: a mock would have agreed with
 * every wrong assumption listed above.
 */
config({ path: ".env.local", quiet: true });

export const DATABASE_URL = process.env.DIRECT_URL ?? "";
export const hasDatabase = DATABASE_URL.length > 0;

export type Tx = {
  /** Runs a statement, failing the test if it errors. */
  query: <T = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ) => Promise<T[]>;
  /**
   * Runs a statement expected to be refused, and reports the SQLSTATE. Wrapped
   * in a savepoint because the first error aborts a Postgres transaction and
   * every later statement in it, which silently turns the rest of a test into
   * noise.
   */
  attempt: (sql: string, values?: unknown[]) => Promise<string | null>;
  /** Switches to a PostgREST role, with claims when signed in. */
  become: (role: "anon" | "authenticated", userId?: string) => Promise<void>;
};

/**
 * Runs `body` against a rolled-back transaction. The rollback is in a `finally`
 * so a failing assertion cannot leave the connection holding locks.
 */
export async function withRollback(
  body: (tx: Tx) => Promise<void>,
): Promise<void> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  let savepoint = 0;
  try {
    await client.query("begin");
    const tx: Tx = {
      query: async <T,>(sql: string, values?: unknown[]) =>
        (await client.query(sql, values as never)).rows as T[],
      attempt: async (sql, values) => {
        const name = `sp${savepoint++}`;
        await client.query(`savepoint ${name}`);
        try {
          await client.query(sql, values as never);
          await client.query(`release savepoint ${name}`);
          return null;
        } catch (error) {
          await client.query(`rollback to savepoint ${name}`);
          return (error as { code?: string }).code ?? "unknown";
        }
      },
      become: async (role, userId) => {
        await client.query("reset role");
        await client.query(`set local role ${role}`);
        await client.query(
          `select set_config('request.jwt.claims', $1, true)`,
          [
            userId
              ? JSON.stringify({ sub: userId, role })
              : JSON.stringify({ role }),
          ],
        );
      },
    };
    await body(tx);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end().catch(() => {});
  }
}

/** A profile id for each class of account the policies distinguish. */
export async function subjects(tx: Tx) {
  const [ordinary] = await tx.query<{ id: string; username: string }>(
    `select id, username from public.profiles where role = 'USER' order by created_at limit 1`,
  );
  const [moderator] = await tx.query<{ id: string; username: string }>(
    `select id, username from public.profiles where role in ('MODERATOR','ADMIN') order by created_at limit 1`,
  );
  const [other] = await tx.query<{ id: string; username: string }>(
    `select id, username from public.profiles where role = 'USER' order by created_at desc limit 1`,
  );
  return { ordinary, moderator, other };
}
