import assert from "node:assert/strict";
import test from "node:test";
import {
  accelerateCatalogStore,
  type CatalogAcceleration,
} from "../../lib/redis-catalog-cache.ts";
import {
  createPublicCatalogCache,
  type CatalogEntry,
  type CatalogStore,
} from "../../lib/public-catalog-cache.ts";

function fixture() {
  let time = 100_000;
  let reads = 0;
  let calls = 0;
  const saved = new Map<string, CatalogEntry>();
  const hot = new Map<string, CatalogEntry>();
  const locks = new Map<string, string>();
  const durable: CatalogStore = {
    async read(keys) {
      reads++;
      return new Map(
        keys.filter((k) => saved.has(k)).map((k) => [k, saved.get(k)!]),
      );
    },
    async claim(keys, ttl) {
      return keys
        .filter(
          (k) =>
            !locks.has(k) &&
            (!saved.get(k)?.value || time - saved.get(k)!.fetchedAt >= ttl),
        )
        .map((key) => {
          const token = String(++calls);
          locks.set(key, token);
          return { key, token };
        });
    },
    async write(claims, values) {
      for (const { key, token } of claims) {
        assert.equal(locks.get(key), token);
        saved.set(key, {
          value: values.get(key)!,
          fetchedAt: time,
          retryAt: 0,
          error: null,
        });
        locks.delete(key);
      }
    },
    async fail(claims) {
      for (const { key } of claims) {
        const old = saved.get(key);
        saved.set(key, {
          value: old?.value ?? null,
          fetchedAt: old?.fetchedAt ?? 0,
          retryAt: time + 30000,
          error: "rate_limited",
        });
        locks.delete(key);
      }
    },
  };
  const redis: CatalogAcceleration = {
    async read(keys) {
      return new Map(
        keys.filter((k) => hot.has(k)).map((k) => [k, hot.get(k)!]),
      );
    },
    async put(entries) {
      for (const [k, v] of entries) if (v.value) hot.set(k, v);
    },
    async remove(keys) {
      keys.forEach((k) => hot.delete(k));
    },
  };
  const make = (accelerator = redis) =>
    createPublicCatalogCache({
      store: accelerateCatalogStore(
        durable,
        accelerator,
        undefined,
        () => time,
      ),
      defer: () => {},
      now: () => time,
    });
  return {
    saved,
    hot,
    redis,
    durable,
    make,
    advance: (ms: number) => {
      time += ms;
    },
    get reads() {
      return reads;
    },
  };
}
const opts = { ttlMs: 1000, staleMs: 2000 };
const load = async (keys: string[]) => new Map(keys.map((k) => [k, [k]]));

test("Redis hydrates from existing durable answers without renewing freshness", async () => {
  const f = fixture();
  f.saved.set("one", {
    value: [1],
    fetchedAt: 99_500,
    retryAt: 0,
    error: null,
  });
  assert.deepEqual((await f.make().read(["one"], load, opts)).get("one"), [1]);
  assert.equal(f.hot.get("one")!.fetchedAt, 99_500);
  const reads = f.reads;
  assert.deepEqual((await f.make().read(["one"], load, opts)).get("one"), [1]);
  assert.equal(f.reads, reads, "a new worker reads Redis without SQL");
});

test("Redis outage still shares one durable refresh lease with a healthy worker", async () => {
  const f = fixture();
  const down: CatalogAcceleration = {
    read: async () => {
      throw Error("offline");
    },
    put: async () => {
      throw Error("offline");
    },
    remove: async () => {
      throw Error("offline");
    },
  };
  let upstream = 0;
  const loader = async (keys: string[]) => {
    upstream++;
    await new Promise((r) => setTimeout(r, 20));
    return load(keys);
  };
  const answers = await Promise.all([
    f.make().read(["one"], loader, opts),
    f.make(down).read(["one"], loader, opts),
  ]);
  assert.equal(upstream, 1);
  for (const answer of answers) assert.deepEqual(answer.get("one"), ["one"]);
});

test("failed refresh removes Redis copy and preserves durable cooldown and timestamp", async () => {
  const f = fixture();
  const entry = { value: [], fetchedAt: 99_000, retryAt: 0, error: null };
  f.saved.set("one", entry);
  f.hot.set("one", entry);
  await assert.rejects(
    f.make().read(
      ["one"],
      async () => {
        throw Error("IGDB is rate limited");
      },
      { ...opts, allowStale: false },
    ),
  );
  assert.equal(f.hot.has("one"), false);
  assert.equal(f.saved.get("one")!.fetchedAt, 99_000);
  await assert.rejects(
    f.make().read(["one"], load, { ...opts, allowStale: false }),
    /rate limited/,
  );
});

test("incomplete cold loads persist neither Redis nor a successful prefix", async () => {
  const f = fixture();
  await assert.rejects(
    f.make().read(["one", "two"], async () => new Map([["one", [1]]]), opts),
    /Incomplete/,
  );
  assert.equal(f.hot.size, 0);
  assert.equal(f.saved.get("one")!.value, null);
});

test("Redis population failure cannot lose a successfully persisted complete answer", async () => {
  const f = fixture();
  const accelerator = {
    ...f.redis,
    put: async () => {
      throw Error("OOM");
    },
  };
  assert.deepEqual(
    (await f.make(accelerator).read(["one"], load, opts)).get("one"),
    ["one"],
  );
  assert.deepEqual(f.saved.get("one")!.value, ["one"]);
});

test("a stale Redis copy cannot hide a newer durable answer when population is skipped", async () => {
  const f = fixture();
  const old = { value: ["old"], fetchedAt: 98_000, retryAt: 0, error: null };
  f.saved.set("one", old);
  f.hot.set("one", old);
  const pressured = { ...f.redis, put: async () => {} };
  let upstream = 0;
  const loader = async (keys: string[]) => {
    upstream++;
    return load(keys);
  };
  await f.make(pressured).read(["one"], loader, { ...opts, allowStale: false });
  const restarted = await f
    .make(pressured)
    .read(["one"], loader, { ...opts, allowStale: false });
  assert.deepEqual(restarted.get("one"), ["one"]);
  assert.equal(
    upstream,
    1,
    "refreshing readers use durable freshness, not an obsolete Redis copy",
  );
  assert.equal(f.hot.get("one")!.fetchedAt, 98_000);
});
