import { config } from "dotenv";
import { Pool } from "pg";
import { createCatalogStore } from "../lib/catalog-store";
import { createRedisCatalogCache } from "../lib/redis-catalog-cache";
config({ path: ".env.local", quiet: true });

/** Copy complete public answers only, preserving timestamps and never calling IGDB. */
async function main() {
  if (!process.env.REDIS_URL) throw new Error("Redis is not configured");
  const { createCatalogRedisClient, catalogRedisOptions } =
    await import("../lib/catalog-redis-client");
  const redis = createCatalogRedisClient(catalogRedisOptions());
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const start = performance.now();
    const { rows } = await pool.query<{ cache_key: string }>(
      "select cache_key from private.igdb_catalog_cache where data is not null and fetched_at > now()-interval '7 days' order by cache_key",
    );
    const saved = await createCatalogStore(pool).read(
      rows.map((row) => row.cache_key),
    );
    await createRedisCatalogCache(redis).put(saved);
    console.log(
      JSON.stringify({
        completeAnswers: saved.size,
        upstreamRequests: 0,
        elapsedMs: Math.round(performance.now() - start),
      }),
    );
  } finally {
    redis.close();
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Redis catalogue hydration failed. Check database, Redis and trusted certificate settings.",
  );
  process.exitCode = 1;
});
