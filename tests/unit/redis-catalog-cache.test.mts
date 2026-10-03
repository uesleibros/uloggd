import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  accelerateCatalogStore,
  createRedisCatalogCache,
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

test("large complete IGDB batches round-trip through compressed Redis entries", async () => {
  const stored = new Map<string, string>();
  const redis = createRedisCatalogCache({
    hmGet: async (_key, fields) => fields.map((k) => stored.get(k) ?? null),
    eval: async (_script, { arguments: args }) => {
      for (let i = 5; i < args.length; i += 2) stored.set(args[i], args[i + 1]);
      return 0;
    },
  });
  const value = Array.from({ length: 500 }, (_, id) => ({
    id,
    name: `Game ${id}`,
    summary: "Public catalogue description. ".repeat(50),
    screenshots: Array.from({ length: 5 }, (_, i) => ({
      image_id: `game-${id}-${i}`,
    })),
  }));
  const entry = { value, fetchedAt: Date.now(), retryAt: 0, error: null };
  assert.ok(Buffer.byteLength(JSON.stringify(entry)) > 256 * 1024);
  await redis.put(new Map([["query:large", entry]]));
  assert.ok(Buffer.byteLength(stored.get("query:large")!) < 256 * 1024);
  assert.deepEqual(
    (await redis.read(["query:large"])).get("query:large"),
    entry,
  );
});
test("poorly compressible catalogue answers are retained above the old 256 KiB limit", async () => {
  const stored = new Map<string, string>();
  const redis = createRedisCatalogCache({
    hmGet: async (_key, fields) => fields.map((k) => stored.get(k) ?? null),
    eval: async (_script, { arguments: args }) => {
      for (let i = 5; i < args.length; i += 2) stored.set(args[i], args[i + 1]);
      return 0;
    },
  });
  const entry = {
    value: [{ summary: randomBytes(384 * 1024).toString("base64") }],
    fetchedAt: Date.now(),
    retryAt: 0,
    error: null,
  };
  await redis.put(new Map([["query:large", entry]]));
  assert.ok(Buffer.byteLength(stored.get("query:large")!) > 256 * 1024);
  assert.deepEqual(
    (await redis.read(["query:large"])).get("query:large"),
    entry,
  );
});

test(
  "durable hits and fresh writes finish before deferred Redis population",
  { timeout: 1000 },
  async () => {
    const f = fixture();
    f.saved.set("warm", {
      value: [1],
      fetchedAt: 99_500,
      retryAt: 0,
      error: null,
    });
    const tasks: (() => Promise<void>)[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store = accelerateCatalogStore(
      f.durable,
      {
        ...f.redis,
        put: async (entries) => {
          await held;
          await f.redis.put(entries);
        },
      },
      undefined,
      () => 100_000,
      (task) => tasks.push(task),
    );
    assert.deepEqual((await store.read(["warm"])).get("warm")?.value, [1]);
    const claims = await store.claim(["cold"], 1000);
    await store.write(claims, new Map([["cold", [2]]]));
    assert.deepEqual(f.saved.get("cold")?.value, [2]);
    assert.equal(f.hot.size, 0);
    const flushing = Promise.all(tasks.map((task) => task()));
    release();
    await flushing;
    assert.deepEqual(f.hot.get("warm")?.value, [1]);
    assert.deepEqual(f.hot.get("cold")?.value, [2]);
  },
);

test("deferred population is bounded and rejected scheduling keeps durable reads usable", async () => {
  const f = fixture();
  const tasks: (() => Promise<void>)[] = [];
  const store = accelerateCatalogStore(
    f.durable,
    f.redis,
    undefined,
    () => 100_000,
    (task) => tasks.push(task),
  );
  for (let index = 0; index < 10; index++) {
    const key = String(index);
    f.saved.set(key, {
      value: [index],
      fetchedAt: 99_500,
      retryAt: 0,
      error: null,
    });
    assert.deepEqual((await store.read([key])).get(key)?.value, [index]);
  }
  assert.equal(tasks.length, 4);
  await Promise.all(tasks.map((task) => task()));
  const refused = accelerateCatalogStore(
    f.durable,
    f.redis,
    undefined,
    () => 100_000,
    () => {
      throw Error("no response context");
    },
  );
  assert.deepEqual((await refused.read(["9"])).get("9")?.value, [9]);
});

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

test("a lookup writes nothing and runs no script", async () => {
  const calls: string[] = [];
  const stored = new Map<string, string>([
    [
      "q",
      JSON.stringify({ value: [1], fetchedAt: Date.now(), retryAt: 0, error: null }),
    ],
  ]);
  const redis = createRedisCatalogCache({
    hmGet: async (_key, fields) => {
      calls.push("hmGet");
      return fields.map((k) => stored.get(k) ?? null);
    },
    eval: async () => {
      calls.push("eval");
      return 0;
    },
  });
  assert.deepEqual((await redis.read(["q", "missing"])).get("q")?.value, [1]);
  assert.deepEqual(calls, ["hmGet"]);
});

test("an answer past retention is a miss, not a served stale copy", async () => {
  const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const redis = createRedisCatalogCache({
    hmGet: async (_key, fields) =>
      fields.map(() =>
        JSON.stringify({ value: [1], fetchedAt: old, retryAt: 0, error: null }),
      ),
    eval: async () => 0,
  });
  assert.equal((await redis.read(["q"])).size, 0);
});

test("population is cut into short scripts and checks memory on a timer", async () => {
  const scripts: string[][] = [];
  let clock = 1_000_000;
  const redis = createRedisCatalogCache(
    {
      hmGet: async (_key, fields) => fields.map(() => null),
      eval: async (_script, { arguments: args }) => {
        scripts.push(args);
        return 0;
      },
    },
    { now: () => clock },
  );
  const many = new Map(
    Array.from({ length: 150 }, (_, index) => [
      "k" + index,
      { value: [index], fetchedAt: clock, retryAt: 0, error: null },
    ]),
  );
  await redis.put(many);
  // Three scripts of at most 64 entries rather than one of 150.
  assert.equal(scripts.length, 3);
  assert.ok(scripts.every((args) => (args.length - 5) / 2 <= 64));
  // The first asks the server for its memory; the next two, a moment later, do not.
  assert.notEqual(scripts[0][4], "0");
  assert.equal(scripts[1][4], "0");
  assert.equal(scripts[2][4], "0");
  clock += 31_000;
  await redis.put(new Map([["late", { value: [1], fetchedAt: clock, retryAt: 0, error: null }]]));
  assert.notEqual(scripts[3][4], "0");
});

test("a fresh write copies the answers in hand rather than reading them back", async () => {
  const f = fixture();
  const tasks: (() => Promise<void>)[] = [];
  const store = accelerateCatalogStore(
    f.durable,
    f.redis,
    undefined,
    () => 100_000,
    (task) => tasks.push(task),
  );
  const claims = await store.claim(["cold"], 1000);
  const before = f.reads;
  await store.write(claims, new Map([["cold", [2]]]));
  await Promise.all(tasks.map((task) => task()));
  assert.equal(f.reads, before, "no SQL read to fill Redis after a write");
  assert.deepEqual(f.hot.get("cold")?.value, [2]);
});
