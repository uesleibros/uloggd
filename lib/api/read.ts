import "server-only";
import type { PoolClient, QueryResultRow } from "pg";

/** The same data envelope for SQL reads and API responses. */
export async function readRows<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  sql: string,
  values: unknown[] = [],
) {
  const result = await client.query<T>(sql, values);
  return { data: result.rows };
}
