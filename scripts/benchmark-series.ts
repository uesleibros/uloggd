import assert from "node:assert/strict";
import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local", quiet: true });

/** Measures the real endpoint with a private, disposable account and public games. */
async function main() {
  const origin = process.argv[2] ?? "http://localhost:3100";
  const { createAccount, destroyAccount, issueApiKey, makePrivate } =
    await import("../tests/e2e/fixtures/account");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const account = await createAccount("seriesbench");
  try {
    await makePrivate(account);
    const { rows: games } = await pool.query<{ id: number; slug: string }>(`
      with games as (
        select jsonb_array_elements(data) as game from private.igdb_catalog_cache
        where cache_key like 'series-games:v1:%:versions'
      ) select distinct (game->>'id')::int as id,game->>'slug' as slug
        from games join private.igdb_catalog_cache as relation
          on relation.cache_key='series-of:v1:'||(game->>'id')
        where jsonb_array_length(relation.data)>0
        order by id limit 100`);
    assert.ok(
      games.length > 0,
      "Warm public catalogues before running this benchmark",
    );
    await pool.query(
      `insert into public.user_games(profile_id,igdb_id,game_slug,status)
      select $1::uuid,id,slug,'COMPLETED' from jsonb_to_recordset($2::jsonb) as game(id int,slug text)`,
      [account.id, JSON.stringify(games)],
    );
    const { token } = await issueApiKey(account, ["library.read"]);
    const timings: number[] = [];
    let series = 0,
      bytes = 0;
    for (let index = 0; index < 6; index++) {
      const start = performance.now();
      const response = await fetch(new URL("/api/v1/library/series", origin), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(60_000),
      });
      const body = await response.text();
      assert.equal(response.status, 200, "Series endpoint must succeed");
      const parsed = JSON.parse(body);
      assert.ok(Array.isArray(parsed.index) && parsed.index.length > 0);
      timings.push(Math.round(performance.now() - start));
      series = parsed.index.length;
      bytes = Buffer.byteLength(body);
    }
    console.log(
      JSON.stringify({
        origin,
        games: games.length,
        series,
        responseBytes: bytes,
        elapsedMs: timings,
      }),
    );
  } finally {
    await destroyAccount(account);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Series benchmark failed",
  );
  process.exitCode = 1;
});
