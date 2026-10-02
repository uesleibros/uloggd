export type CatalogEntry = {
  value: unknown[] | null;
  fetchedAt: number;
  retryAt: number;
  error: string | null;
};
export type CatalogClaim = { key: string; token: string };
export type CatalogStore = {
  read(keys: string[]): Promise<Map<string, CatalogEntry>>;
  claim(keys: string[], ttlMs: number): Promise<CatalogClaim[]>;
  write(claims: CatalogClaim[], values: Map<string, unknown[]>): Promise<void>;
  fail(claims: CatalogClaim[], error: unknown): Promise<void>;
};
type Options = { ttlMs: number; staleMs?: number; allowStale?: boolean };

/** Complete public answers only. Holdings, ignored ids and viewer data stay outside. */
export function createPublicCatalogCache({
  store,
  defer,
  now = Date.now,
  sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  maxBytes = 24 * 1024 * 1024,
  maxEntries = 20_000,
  waitMs = 15_000,
  onRefreshError = () => {},
}: {
  store: CatalogStore;
  defer: (task: () => Promise<void>) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  maxBytes?: number;
  maxEntries?: number;
  waitMs?: number;
  onRefreshError?: (error: unknown) => void;
}) {
  const memory = new Map<string, CatalogEntry & { bytes: number }>();
  const flights = new Map<string, Promise<unknown[]>>();
  const scheduled = new Set<string>();
  let bytes = 0;
  function remember(key: string, entry: CatalogEntry) {
    if (!entry.value) return;
    const size = Buffer.byteLength(JSON.stringify(entry.value));
    bytes -= memory.get(key)?.bytes ?? 0;
    memory.delete(key);
    if (size <= maxBytes) {
      memory.set(key, { ...entry, bytes: size });
      bytes += size;
    }
    while (memory.size > maxEntries || bytes > maxBytes) {
      const oldest = memory.keys().next().value!;
      bytes -= memory.get(oldest)!.bytes;
      memory.delete(oldest);
    }
  }
  const fresh = (entry: CatalogEntry | undefined, ttl: number) =>
    entry?.value !== null &&
    entry?.value !== undefined &&
    now() - entry.fetchedAt < ttl;

  function ensureFresh(
    keys: string[],
    load: (keys: string[]) => Promise<Map<string, unknown[]>>,
    options: Options,
  ) {
    const missing = keys.filter((key) => !flights.has(key));
    if (missing.length) {
      // Reserve keys before any awaits. Database leases coordinate other workers.
      const batch = Promise.resolve().then(async () => {
        const answers = new Map<string, unknown[]>();
        let remaining = missing;
        const deadline = now() + waitMs;
        let pause = 100;
        while (remaining.length) {
          const saved = await store.read(remaining);
          for (const key of remaining) {
            const entry = saved.get(key);
            if (entry?.value) remember(key, entry);
            if (fresh(entry, options.ttlMs)) {
              answers.set(key, entry!.value!);
              remember(key, entry!);
            } else if (entry?.error && entry.retryAt > now()) {
              throw new Error(
                entry.error === "rate_limited"
                  ? "IGDB is rate limited right now"
                  : "Catalogue unavailable",
              );
            }
          }
          remaining = remaining.filter((key) => !answers.has(key));
          if (!remaining.length) break;
          const claims = await store.claim(remaining, options.ttlMs);
          if (claims.length) {
            try {
              const loaded = await load(claims.map(({ key }) => key));
              if (claims.some(({ key }) => !Array.isArray(loaded.get(key))))
                throw new Error("Incomplete catalogue batch");
              await store.write(claims, loaded);
              const fetchedAt = now();
              for (const { key } of claims) {
                const value = loaded.get(key)!;
                answers.set(key, value);
                remember(key, { value, fetchedAt, retryAt: 0, error: null });
              }
            } catch (error) {
              await store.fail(claims, error).catch(() => undefined);
              for (const { key } of claims) {
                const old = memory.get(key);
                if (old)
                  remember(key, {
                    ...old,
                    retryAt: now() + 30_000,
                    error: "unavailable",
                  });
              }
              throw error;
            }
          }
          remaining = remaining.filter((key) => !answers.has(key));
          if (remaining.length) {
            if (now() >= deadline)
              throw new Error(
                "IGDB is rate limited while a catalogue refresh is in progress",
              );
            await sleep(pause);
            pause = Math.min(500, pause * 2);
          }
        }
        return answers;
      });
      for (const key of missing) {
        const flight = batch
          .then((answer) => answer.get(key)!)
          .finally(() => flights.delete(key));
        void flight.catch(() => undefined);
        flights.set(key, flight);
      }
    }
    return Promise.all(
      keys.map(async (key) => [key, await flights.get(key)!] as const),
    ).then((rows) => new Map(rows));
  }

  return {
    async read<T>(
      keys: string[],
      load: (keys: string[]) => Promise<Map<string, T[]>>,
      options: Options,
    ): Promise<Map<string, T[]>> {
      const wanted = [...new Set(keys)];
      const saved = new Map<string, CatalogEntry>();
      const missing: string[] = [];
      for (const key of wanted) {
        const entry = memory.get(key);
        if (
          entry?.value &&
          (fresh(entry, options.ttlMs) ||
            (options.allowStale !== false &&
              now() - entry.fetchedAt < options.ttlMs + (options.staleMs ?? 0)))
        )
          saved.set(key, entry);
        else missing.push(key);
      }
      if (missing.length) {
        const persisted = await store.read(missing);
        for (const [key, entry] of persisted) {
          saved.set(key, entry);
          remember(key, entry);
        }
      }
      const answer = new Map<string, unknown[]>();
      const cold: string[] = [];
      const stale: string[] = [];
      for (const key of wanted) {
        const entry = saved.get(key);
        if (fresh(entry, options.ttlMs)) answer.set(key, entry!.value!);
        else if (
          entry?.value &&
          options.allowStale !== false &&
          now() - entry.fetchedAt < options.ttlMs + (options.staleMs ?? 0)
        ) {
          answer.set(key, entry.value);
          if (
            entry.retryAt <= now() &&
            !scheduled.has(key) &&
            !flights.has(key)
          )
            stale.push(key);
        } else cold.push(key);
      }
      if (stale.length) {
        for (const key of stale) scheduled.add(key);
        const task = async () => {
          try {
            await ensureFresh(stale, load, options);
          } catch (error) {
            onRefreshError(error);
          } finally {
            for (const key of stale) scheduled.delete(key);
          }
        };
        try {
          defer(task);
        } catch (error) {
          for (const key of stale) scheduled.delete(key);
          onRefreshError(error);
        }
      }
      if (cold.length) {
        const loaded = await ensureFresh(cold, load, options);
        for (const [key, value] of loaded) answer.set(key, value);
      }
      return answer as Map<string, T[]>;
    },
  };
}
