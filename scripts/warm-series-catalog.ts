import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local", quiet: true });

/** Reusable public catalogue warmup. Never persists holdings or owner identities. */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => {
    if (String(args[0]).startsWith("https://api.igdb.com/")) calls++;
    return originalFetch(...args);
  };
  try {
    const { getGamesSeries, getSeriesGamesMany } = await import("../lib/igdb");
    const { rows } = await pool.query<{ id: number }>(
      "select distinct igdb_id as id from public.user_games order by igdb_id",
    );
    const start = performance.now();
    const seriesOf = await getGamesSeries(
      rows.map(({ id }) => id),
      { strict: true, allowStale: false },
    );
    const list = [
      ...new Map(
        [...seriesOf.values()].map((series) => [
          series.kind + ":" + series.id,
          series,
        ]),
      ).values(),
    ];
    const memberships = await getSeriesGamesMany(list, {
      strict: true,
      allowStale: false,
    });
    console.log(
      JSON.stringify({
        games: rows.length,
        series: memberships.size,
        memberships: [...memberships.values()].reduce(
          (sum, games) => sum + games.length,
          0,
        ),
        upstreamRequests: calls,
        elapsedMs: Math.round(performance.now() - start),
      }),
    );
  } finally {
    globalThis.fetch = originalFetch;
    await pool.end();
    await globalThis.uloggdApiPool?.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Catalogue warmup failed",
  );
  process.exitCode = 1;
});
