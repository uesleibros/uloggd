/** Public catalogue only: never cache a viewer's holdings or ignored ids here. */
export function createCatalogBatchCache<T>({
  ttlMs,
  staleMs,
  retryMs = 30_000,
  maxEntries = 256,
  maxItems = 20_000,
  now = Date.now,
}: {
  ttlMs: number;
  staleMs: number;
  retryMs?: number;
  maxEntries?: number;
  maxItems?: number;
  now?: () => number;
}) {
  const saved = new Map<string, { value: T[]; at: number }>();
  const flights = new Map<string, Promise<T[]>>();
  const refused = new Map<string, { error: unknown; until: number }>();
  let items = 0;
  function remember(key: string, value: T[]) {
    items -= saved.get(key)?.value.length ?? 0;
    saved.delete(key);
    if (value.length <= maxItems) {
      saved.set(key, { value, at: now() });
      items += value.length;
    }
    while (saved.size > maxEntries || items > maxItems) {
      const oldest = saved.keys().next().value!;
      items -= saved.get(oldest)!.value.length;
      saved.delete(oldest);
    }
  }
  return async function read(
    keys: string[],
    load: (missing: string[]) => Promise<Map<string, T[]>>,
    onStale?: () => void,
  ): Promise<Map<string, T[]>> {
    const wanted = [...new Set(keys)];
    const missing = wanted.filter((key) => {
      const entry = saved.get(key);
      return (
        !(entry && now() - entry.at < ttlMs) &&
        !flights.has(key) &&
        (refused.get(key)?.until ?? 0) <= now()
      );
    });
    if (missing.length) {
      // Reserve every key before invoking the loader, including overlapping reads.
      const batch = Promise.resolve()
        .then(() => load(missing))
        .then((answer) => {
          if (missing.some((key) => !Array.isArray(answer.get(key))))
            throw new Error("Incomplete catalogue batch");
          for (const key of missing) {
            remember(key, answer.get(key)!);
            refused.delete(key);
          }
          return answer;
        })
        .catch((error: unknown) => {
          for (const key of missing) {
            refused.set(key, { error, until: now() + retryMs });
          }
          while (refused.size > maxEntries)
            refused.delete(refused.keys().next().value!);
          throw error;
        });
      for (const key of missing) {
        const flight = batch
          .then((answer) => answer.get(key)!)
          .finally(() => flights.delete(key));
        // A caller may fail on another key first; every reserved promise is observed.
        void flight.catch(() => undefined);
        flights.set(key, flight);
      }
    }
    let stale = false;
    const values = await Promise.all(
      wanted.map(async (key) => {
        const entry = saved.get(key);
        if (entry && now() - entry.at < ttlMs)
          return [key, entry.value] as const;
        try {
          const flight = flights.get(key);
          if (flight) return [key, await flight] as const;
          throw refused.get(key)?.error ?? new Error("Catalogue unavailable");
        } catch (error) {
          if (!entry || now() - entry.at > ttlMs + staleMs) throw error;
          stale = true;
          return [key, entry.value] as const;
        }
      }),
    );
    if (stale) onStale?.();
    return new Map(values);
  };
}
