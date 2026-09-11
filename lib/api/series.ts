import "server-only";

/**
 * Reads that share one connection, run one after another.
 *
 * A pg client is a single connection with a single protocol stream, so it can
 * carry exactly one query at a time. `Promise.all` over `client.query` looks
 * like parallelism and is not: the driver queues them and warns that calling
 * `query` while the client is busy is deprecated, which becomes an error in
 * pg@9. Sixteen call sites did this, and the warning was on every page of the
 * production log.
 *
 * The reads cannot simply move to separate connections. `asOwner` opens a
 * transaction and sets the row-level identity on that one client, so a query on
 * another connection would run as nobody. And the pool is four per worker: a
 * request that took four connections to read one page would starve the next
 * three requests rather than speed itself up.
 *
 * So they run in series, which is what was already happening, minus the
 * pretence. This exists rather than a plain sequence of awaits so the call
 * sites keep reading as a list of independent reads, which is what they are:
 *
 *   const [rows, count] = await series(
 *     () => client.query(ITEMS, args),
 *     () => client.query(COUNT, args),
 *   );
 *
 * Fewer round trips is the real fix where one is needed, and that means one
 * query, not one connection each.
 */
export async function series<T extends readonly unknown[]>(
  ...tasks: { [K in keyof T]: () => Promise<T[K]> }
): Promise<T> {
  const answers = [] as unknown[];
  for (const task of tasks) answers.push(await task());
  return answers as unknown as T;
}
