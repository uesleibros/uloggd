import "server-only";
import { escapeLiteral, type PoolClient } from "pg";
import { apiPool } from "./pool";

export async function asOwner<T>(
  profileId: string | null,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await apiPool().connect();
  try {
    const role = profileId ? "authenticated" : "anon";
    const claims = escapeLiteral(
      JSON.stringify(profileId ? { sub: profileId, role } : { role }),
    );
    // One protocol round trip establishes the transaction and its RLS identity.
    // Escape the literal with the driver because a parameterized multi-statement query is unsupported.
    //
    // The time limits too. Supabase gives `anon` and `authenticated` a few
    // seconds each, but as settings on the roles, which only take effect for a
    // session that logs in as them. This one logs in as `postgres` and switches
    // role inside the transaction, so every query here ran under postgres's two
    // minutes: one stuck query held one of the worker's four connections that
    // long, and four of them stopped its API. The largest account's export, the
    // heaviest statement the API runs, takes 144ms.
    await client.query(
      `begin; set local role ${role}; set local statement_timeout = '8s'; set local lock_timeout = '8s'; select set_config('request.jwt.claims', ${claims}, true)`,
    );
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
