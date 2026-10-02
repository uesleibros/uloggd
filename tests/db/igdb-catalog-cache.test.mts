import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createCatalogStore } from "../../lib/catalog-store.ts";
import { createPublicCatalogCache } from "../../lib/public-catalog-cache.ts";
import { DATABASE_URL, hasDatabase, withRollback } from "./harness.mts";

test(
  "the public catalogue cache is inaccessible to browser database roles",
  { skip: !hasDatabase },
  async () => {
    await withRollback(async (tx) => {
      for (const role of ["anon", "authenticated"] as const) {
        await tx.become(role);
        assert.equal(
          await tx.attempt("select data from private.igdb_catalog_cache"),
          "42501",
        );
        assert.equal(
          await tx.attempt(
            "insert into private.igdb_catalog_cache(cache_key) values ('forbidden')",
          ),
          "42501",
        );
      }
    });
  },
);

test(
  "database leases deduplicate separate workers and survive process replacement",
  { skip: !hasDatabase },
  async () => {
    const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    const key = "test:" + randomUUID();
    let upstream = 0;
    const load = async () => {
      upstream++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return new Map([[key, [{ id: 42 }]]]);
    };
    const make = () =>
      createPublicCatalogCache({
        store: createCatalogStore(pool),
        defer() {
          throw Error("Unexpected stale read");
        },
      });
    try {
      const options = { ttlMs: 60_000 };
      const [a, b] = await Promise.all([
        make().read([key], load, options),
        make().read([key], load, options),
      ]);
      assert.deepEqual(a, b);
      assert.equal(upstream, 1);
      const persisted = (await createCatalogStore(pool).read([key])).get(key)!;
      await make().read([key], load, options);
      assert.equal(upstream, 1);
      assert.equal(
        (await createCatalogStore(pool).read([key])).get(key)!.fetchedAt,
        persisted.fetchedAt,
      );
    } finally {
      await pool.query(
        "delete from private.igdb_catalog_cache where cache_key=$1",
        [key],
      );
      await pool.end();
    }
  },
);

test(
  "expired owners cannot overwrite a newer catalogue or its failure cooldown",
  { skip: !hasDatabase },
  async () => {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const key = "test:" + randomUUID();
    const store = createCatalogStore(pool);
    try {
      const old = await store.claim([key], 1000);
      await pool.query(
        "update private.igdb_catalog_cache set refresh_until='-infinity' where cache_key=$1",
        [key],
      );
      const replacement = await store.claim([key], 1000);
      await store.write(replacement, new Map([[key, ["new"]]]));
      await assert.rejects(
        store.write(old, new Map([[key, ["old"]]])),
        /lease expired/,
      );
      await store.fail(old, Error("rate limited"));
      const entry = (await store.read([key])).get(key)!;
      assert.deepEqual(entry.value, ["new"]);
      assert.equal(entry.error, null);
      // This checks a still-fresh answer, not expiry during several SQL round trips.
      assert.deepEqual(await store.claim([key], 60_000), []);
    } finally {
      await pool.query(
        "delete from private.igdb_catalog_cache where cache_key=$1",
        [key],
      );
      await pool.end();
    }
  },
);

test(
  "failed refreshes preserve the complete answer and timestamp in the database",
  { skip: !hasDatabase },
  async () => {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const key = "test:" + randomUUID();
    const store = createCatalogStore(pool);
    try {
      const first = await store.claim([key], 0);
      await store.write(first, new Map([[key, []]]));
      const original = (await store.read([key])).get(key)!;
      const refresh = await store.claim([key], 0);
      await store.fail(refresh, Error("IGDB request failed (429)"));
      const failed = (await store.read([key])).get(key)!;
      assert.deepEqual(failed.value, []);
      assert.equal(failed.fetchedAt, original.fetchedAt);
      assert.equal(failed.error, "rate_limited");
      assert.ok(failed.retryAt > Date.now() + 25_000);
      assert.deepEqual(await store.claim([key], 0), []);
    } finally {
      await pool.query(
        "delete from private.igdb_catalog_cache where cache_key=$1",
        [key],
      );
      await pool.end();
    }
  },
);
