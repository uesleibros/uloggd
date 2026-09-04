import "server-only";
import type { PoolClient } from "pg";
import { apiPool } from "./pool";

export async function asOwner<T>(
  profileId: string,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await apiPool().connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: profileId, role: "authenticated" }),
    ]);
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
