import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { config } from "dotenv";
import { createClient } from "redis";
import { createRedisCatalogCache } from "../../lib/redis-catalog-cache.ts";
import type { CatalogEntry } from "../../lib/public-catalog-cache.ts";
config({ path: ".env.local", quiet: true });

test(
  "real Redis: shared answers, LRU, budgets, expiry, late writers and index eviction",
  { skip: !process.env.REDIS_URL && !process.env.REDIS_TEST_URL },
  async () => {
    const url = process.env.REDIS_TEST_URL || process.env.REDIS_URL;
    const client = createClient({
      url,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: false,
        ...(url?.startsWith("rediss:")
          ? {
              tls: true as const,
              ca: process.env.REDIS_CA_CERT?.replace(/\\n/g, "\n"),
            }
          : {}),
      },
      commandOptions: { timeout: 2000 },
    });
    client.on("error", () => {});
    const namespace = `{uloggd:igdb:test:${randomUUID()}}`;
    const initial = 1_790_000_000_000;
    let time = initial;
    const cache = createRedisCatalogCache(client, {
      namespace,
      maxEntries: 2,
      maxBytes: 4000,
      retentionMs: 60000,
      now: () => time,
    });
    const entry = (value: unknown[], fetchedAt = time): CatalogEntry => ({
      value,
      fetchedAt,
      retryAt: 0,
      error: null,
    });
    const put = (key: string, value: unknown[], fetchedAt = time) =>
      cache.put(new Map([[key, entry(value, fetchedAt)]]));
    try {
      await client.connect();
      await put("one", [1]);
      await put("two", [2]);
      await cache.read(["one"]);
      await put("three", [3]);
      assert.equal(
        (await cache.read(["two"])).size,
        0,
        "least recently used entry evicted",
      );
      const replacement = createRedisCatalogCache(client, {
        namespace,
        now: () => time,
      });
      assert.deepEqual(
        (await replacement.read(["one"])).get("one")!.value,
        [1],
      );
      assert.equal(
        (await replacement.read(["one"])).get("one")!.fetchedAt,
        initial,
      );
      await put("one", [99], initial - 1);
      assert.deepEqual(
        (await cache.read(["one"])).get("one")!.value,
        [1],
        "late SQL read cannot overwrite newer Redis answer",
      );
      await put("big", [randomBytes(1900).toString("base64")]);
      assert.equal(
        await client.zCard(namespace + ":lru"),
        1,
        "byte limit evicts existing entries",
      );
      assert.ok(
        Number(await client.hGet(namespace + ":data", "__bytes")) <= 4000,
      );
      await put("huge", [randomBytes(4000).toString("base64")]);
      assert.equal((await cache.read(["huge"])).size, 0);
      time += 60000;
      assert.equal(
        (await cache.read(["big"])).size,
        0,
        "old answer expires without renewing fetchedAt",
      );
      await put("empty", []);
      assert.deepEqual((await cache.read(["empty"])).get("empty")!.value, []);
      assert.ok((await client.pTTL(namespace + ":data")) <= 60000);
      await client.del(namespace + ":lru");
      assert.equal(
        (await cache.read(["empty"])).size,
        0,
        "partial provider eviction refills from durable cache",
      );
      await put("one", [1]);
      const pressured = createRedisCatalogCache(client, {
        namespace,
        maxServerBytes: 1,
        now: () => time,
      });
      await pressured.put(new Map([["pressure", entry([1])]]));
      assert.equal(
        (await cache.read(["pressure"])).size,
        0,
        "server pressure skips acceleration writes",
      );
      await cache.remove(["one"]);
      assert.equal(await client.exists(namespace + ":data"), 0);
      assert.equal(await client.exists(namespace + ":lru"), 0);
      await assert.rejects(put("__bytes", [1]), /Invalid/);
      const wide = createRedisCatalogCache(client, {
        namespace,
        maxBytes: 8 * 1024 * 1024,
        now: () => time,
      });
      await wide.put(new Map([["oversized", entry(["x".repeat(300 * 1024)])]]));
      assert.equal(
        (await wide.read(["oversized"])).size,
        0,
        "entries over 256 KiB remain in durable storage",
      );
      const large = new Map(
        Array.from({ length: 18 }, (_, index) => [
          `bounded:${index}`,
          entry(["x".repeat(240 * 1024)]),
        ]),
      );
      await wide.put(large);
      const bounded = await wide.read([...large.keys()]);
      assert.ok(
        bounded.size > 0 && bounded.size < large.size,
        "a large response leaves overflow entries for the durable reader",
      );
      assert.ok(
        [...bounded.values()].reduce(
          (total, value) => total + Buffer.byteLength(JSON.stringify(value)),
          0,
        ) <=
          4 * 1024 * 1024,
      );
    } finally {
      if (client.isReady)
        await client.del([namespace + ":data", namespace + ":lru"]);
      if (client.isOpen) client.destroy();
    }
  },
);
