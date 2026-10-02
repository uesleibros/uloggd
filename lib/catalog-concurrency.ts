/** Overlap network latency without creating an unbounded upstream request queue. */
export async function mapCatalogQueries<T, R>(
  values: T[],
  read: (value: T) => Promise<R>,
) {
  const answers: R[] = new Array(values.length);
  let next = 0;
  let failed = false;
  let reason: unknown;
  await Promise.all(
    Array.from({ length: Math.min(4, values.length) }, async () => {
      while (!failed) {
        const index = next++;
        if (index >= values.length) return;
        try {
          answers[index] = await read(values[index]);
        } catch (error) {
          failed = true;
          reason = error;
        }
      }
    }),
  );
  if (failed) throw reason;
  return answers;
}
