import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type {
  CatalogClaim,
  CatalogEntry,
  CatalogStore,
} from "./public-catalog-cache";

/** Uses the backend pool outside owner transactions. No user claims or state. */
export function createCatalogStore(
  pool: Pick<Pool, "query" | "connect">,
): CatalogStore {
  async function prune() {
    // Cleanup also runs after failed loads, so outage placeholders stay bounded.
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query<{ locked: boolean }>(
        "select pg_try_advisory_xact_lock(442917210) as locked",
      );
      if (rows[0].locked) {
        await client.query(`delete from private.igdb_catalog_cache
            where updated_at < now()-interval '7 days' and (refresh_token is null or refresh_until < now())`);
        await client.query(`with ranked as (
            select cache_key, row_number() over (order by (fetched_at is null),updated_at desc,cache_key) as position,
              sum(bytes::bigint) over (order by (fetched_at is null),updated_at desc,cache_key) as total
            from private.igdb_catalog_cache
          ) delete from private.igdb_catalog_cache as saved using ranked
            where saved.cache_key=ranked.cache_key and (saved.refresh_token is null or saved.refresh_until < now())
              and (ranked.position > 20000 or ranked.total > 268435456)`);
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  return {
    async read(keys) {
      if (!keys.length) return new Map();
      const { rows } = await pool.query<{
        cache_key: string;
        data: unknown[] | null;
        fetched_at: Date | null;
        refresh_until: Date | number;
        error_code: string | null;
      }>(
        `select cache_key,data,fetched_at,refresh_until,error_code
          from private.igdb_catalog_cache where cache_key=any($1::text[])`,
        [keys],
      );
      return new Map(
        rows.map((row): [string, CatalogEntry] => [
          row.cache_key,
          {
            value: row.data,
            fetchedAt: row.fetched_at?.getTime() ?? 0,
            retryAt:
              row.refresh_until instanceof Date
                ? row.refresh_until.getTime()
                : Number(row.refresh_until),
            error: row.error_code,
          },
        ]),
      );
    },
    async claim(keys, ttlMs) {
      if (!keys.length) return [];
      const token = randomUUID();
      const { rows } = await pool.query<{ cache_key: string }>(
        `
        insert into private.igdb_catalog_cache as existing
          (cache_key,refresh_token,refresh_until)
        select key,$2::uuid,clock_timestamp()+interval '120 seconds'
          from unnest($1::text[]) as key order by key
        on conflict (cache_key) do update set
          refresh_token=excluded.refresh_token, refresh_until=excluded.refresh_until,
          error_code=null, updated_at=clock_timestamp()
        where existing.refresh_until <= clock_timestamp()
          and (existing.fetched_at is null or existing.fetched_at <= clock_timestamp()-$3*interval '1 millisecond')
        returning cache_key`,
        [keys, token, ttlMs],
      );
      return rows.map(({ cache_key }): CatalogClaim => ({
        key: cache_key,
        token,
      }));
    },
    async write(claims, values) {
      const payload = claims.map(({ key, token }) => {
        const data = values.get(key);
        if (!Array.isArray(data)) throw new Error("Incomplete catalogue batch");
        const bytes = Buffer.byteLength(JSON.stringify(data));
        if (bytes > 8 * 1024 * 1024)
          throw new Error("Catalogue entry exceeds storage limit");
        return { key, token, data, bytes };
      });
      const written = await pool.query(
        `
        update private.igdb_catalog_cache as saved set data=answer.data,
          fetched_at=clock_timestamp(), bytes=answer.bytes, refresh_token=null,
          refresh_until='-infinity', error_code=null, updated_at=clock_timestamp()
        from jsonb_to_recordset($1::jsonb) as answer(key text,token uuid,data jsonb,bytes integer)
        where saved.cache_key=answer.key and saved.refresh_token=answer.token
        returning saved.cache_key`,
        [JSON.stringify(payload)],
      );
      if (written.rowCount !== claims.length)
        throw new Error("Catalogue refresh lease expired");
      await prune();
    },
    async fail(claims, error) {
      const code =
        error instanceof Error && /429|rate limited/.test(error.message)
          ? "rate_limited"
          : "unavailable";
      await pool.query(
        `update private.igdb_catalog_cache as saved
        set refresh_token=null,refresh_until=clock_timestamp()+interval '30 seconds',
          error_code=$2,updated_at=clock_timestamp()
        from jsonb_to_recordset($1::jsonb) as claim(key text,token uuid)
        where saved.cache_key=claim.key and saved.refresh_token=claim.token`,
        [JSON.stringify(claims), code],
      );
      await prune();
    },
  };
}
