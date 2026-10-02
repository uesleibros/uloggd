import assert from "node:assert/strict";
import test from "node:test";
import {
  createPublicCatalogCache,
  type CatalogEntry,
  type CatalogStore,
} from "../../lib/public-catalog-cache.ts";

function setup({ maxEntries = 20_000, maxBytes = 24 * 1024 * 1024 } = {}) {
  let time = 1_000_000;
  let sequence = 0;
  let reads = 0;
  const saved = new Map<string, CatalogEntry>();
  const leased = new Map<string, string>();
  const deferred: (() => Promise<void>)[] = [];
  const store: CatalogStore = {
    async read(keys) {
      reads++;
      return new Map(
        keys
          .filter((key) => saved.has(key))
          .map((key) => [key, saved.get(key)!]),
      );
    },
    async claim(keys, ttl) {
      return keys
        .filter(
          (key) =>
            !leased.has(key) &&
            !(saved.get(key)?.value && time - saved.get(key)!.fetchedAt < ttl),
        )
        .map((key) => {
          const token = String(++sequence);
          leased.set(key, token);
          return { key, token };
        });
    },
    async write(claims, values) {
      for (const { key, token } of claims) {
        assert.equal(leased.get(key), token);
        saved.set(key, {
          value: values.get(key)!,
          fetchedAt: time,
          retryAt: 0,
          error: null,
        });
        leased.delete(key);
      }
    },
    async fail(claims, error) {
      for (const { key } of claims) {
        leased.delete(key);
        saved.set(key, {
          value: saved.get(key)?.value ?? null,
          fetchedAt: saved.get(key)?.fetchedAt ?? 0,
          retryAt: time + 30000,
          error: String(error).includes("rate limited")
            ? "rate_limited"
            : "unavailable",
        });
      }
    },
  };
  const make = () =>
    createPublicCatalogCache({
      store,
      now: () => time,
      defer: (task) => {
        deferred.push(task);
      },
      maxEntries,
      maxBytes,
    });
  return {
    make,
    store,
    saved,
    deferred,
    advance(ms: number) {
      time += ms;
    },
    get reads() {
      return reads;
    },
  };
}
const options = { ttlMs: 1000, staleMs: 2000 };

test("separate workers and a restarted worker reuse complete persisted answers", async () => {
  const fixture = setup();
  let calls = 0;
  const load = async (keys: string[]) => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 30));
    return new Map(keys.map((key) => [key, [key]]));
  };
  const a = fixture.make(),
    b = fixture.make();
  const [one, two] = await Promise.all([
    a.read(["series"], load, options),
    b.read(["series"], load, options),
  ]);
  assert.deepEqual(one, two);
  assert.equal(calls, 1);
  await fixture.make().read(["series"], load, options);
  assert.equal(calls, 1);
  const before = fixture.reads;
  await a.read(["series"], load, options);
  assert.equal(
    fixture.reads,
    before,
    "warm memory does not query either database or upstream",
  );
});

test("stale complete catalogues return immediately and refresh after the response", async () => {
  const fixture = setup();
  const reader = fixture.make();
  await reader.read(["s"], async () => new Map([["s", ["old"]]]), options);
  fixture.advance(1500);
  let refreshed = false;
  const result = await reader.read(
    ["s"],
    async () => {
      refreshed = true;
      return new Map([["s", ["new"]]]);
    },
    options,
  );
  assert.deepEqual(result.get("s"), ["old"]);
  assert.equal(refreshed, false);
  await fixture.deferred[0]();
  assert.equal(refreshed, true);
  assert.deepEqual(
    (
      await reader.read(
        ["s"],
        async () => {
          throw Error("unexpected");
        },
        options,
      )
    ).get("s"),
    ["new"],
  );
});

test("failed refreshes never promote stale timestamps and respect the retry cooldown", async () => {
  const fixture = setup();
  const reader = fixture.make();
  await reader.read(["s"], async () => new Map([["s", []]]), options);
  const original = fixture.saved.get("s")!.fetchedAt;
  fixture.advance(1500);
  let calls = 0;
  const fail = async () => {
    calls++;
    throw new Error("IGDB is rate limited right now");
  };
  await reader.read(["s"], fail, options);
  await fixture.deferred.shift()!();
  await fixture.make().read(["s"], fail, options);
  assert.equal(
    fixture.deferred.length,
    0,
    "persisted cooldown prevents scheduling another refresh",
  );
  assert.equal(calls, 1);
  assert.equal(fixture.saved.get("s")!.fetchedAt, original);
  fixture.advance(2000);
  await assert.rejects(reader.read(["s"], fail, options), /rate limited/);
});

test("a cold rate limit is an error, never a cached empty catalogue", async () => {
  const fixture = setup();
  const reader = fixture.make();
  await assert.rejects(
    reader.read(
      ["s"],
      async () => {
        throw Error("IGDB is rate limited right now");
      },
      options,
    ),
    /rate limited/,
  );
  assert.equal(fixture.saved.get("s")!.value, null);
  await assert.rejects(
    fixture.make().read(
      ["s"],
      async () => {
        throw Error("unexpected");
      },
      options,
    ),
    /rate limited/,
  );
});

test("incomplete batches cannot persist a successful prefix", async () => {
  const fixture = setup();
  await assert.rejects(
    fixture.make().read(["a", "b"], async () => new Map([["a", [1]]]), options),
    /Incomplete/,
  );
  assert.equal(fixture.saved.get("a")?.value, null);
  assert.equal(fixture.saved.get("b")?.value, null);
});

test("memory has both entry and byte ceilings; evicted entries stay in shared storage", async () => {
  const fixture = setup({ maxEntries: 1, maxBytes: 10 });
  const reader = fixture.make();
  let calls = 0;
  const load = async (keys: string[]) => {
    calls++;
    return new Map(keys.map((key) => [key, [key.repeat(20)]]));
  };
  await reader.read(["a", "b"], load, options);
  const before = fixture.reads;
  await reader.read(["a"], load, options);
  assert.ok(fixture.reads > before);
  assert.equal(calls, 1);
});

test("strict readers wait for freshness instead of receiving stale answers", async () => {
  const fixture = setup();
  const reader = fixture.make();
  await reader.read(["s"], async () => new Map([["s", [1]]]), options);
  fixture.advance(1500);
  const result = await reader.read(["s"], async () => new Map([["s", [2]]]), {
    ...options,
    allowStale: false,
  });
  assert.deepEqual(result.get("s"), [2]);
  assert.equal(fixture.deferred.length, 0);
});
