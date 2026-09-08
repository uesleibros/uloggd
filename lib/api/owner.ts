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
    await client.query(
      `begin; set local role ${role}; select set_config('request.jwt.claims', ${claims}, true)`,
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
