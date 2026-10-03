import type { CatalogEntry, CatalogStore } from "./public-catalog-cache";
import { mapCatalogQueries } from "./catalog-concurrency";
import { promisify } from "node:util";
import { gzip, gunzip } from "node:zlib";
const compress = promisify(gzip);
const decompress = promisify(gunzip);
// Large batched IGDB answers compress well; bound decoded and stored sizes separately.
const MAX_DECODED_ENTRY = 4 * 1024 * 1024;

export type CatalogRedis = {
  /** A lookup. Writes nothing, runs no script, and has a short deadline. */
  hmGet(key: string, fields: string[]): Promise<(string | null)[]>;
  /** Population. One at a time per worker, and dropped when behind. */
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
};
export type CatalogAcceleration = {
  read(keys: string[]): Promise<Map<string, CatalogEntry>>;
  put(entries: Map<string, CatalogEntry>): Promise<void>;
  remove(keys: string[]): Promise<void>;
};

// One hash holds complete answers and the byte counter. Both keys share a slot.
// If Redis evicts only one key, discard the incomplete index and refill from SQL.
const prelude = `
local data, lru = KEYS[1], KEYS[2]
if redis.call('EXISTS', data) ~= redis.call('EXISTS', lru) then
  redis.call('DEL', data, lru)
end
local bytes = tonumber(redis.call('HGET', data, '__bytes') or '0')
local clock = math.max(tonumber(redis.call('HGET', data, '__clock') or '0'), tonumber(ARGV[1]) * 1000)
local function touch(key)
  clock = clock + 1
  redis.call('ZADD', lru, string.format('%.0f', clock), key)
end
local function remove(key)
  local old = redis.call('HGET', data, key)
  if old then
    bytes = bytes - string.len(old) - string.len(key) - 1024
    redis.call('HDEL', data, key)
  end
  redis.call('ZREM', lru, key)
end
local function finish()
  if redis.call('ZCARD', lru) == 0 then
    redis.call('DEL', data, lru)
  else
    redis.call('HSET', data, '__bytes', tostring(math.max(0, bytes)))
    redis.call('HSET', data, '__clock', string.format('%.0f', clock))
    redis.call('PEXPIRE', data, ARGV[2])
    redis.call('PEXPIRE', lru, ARGV[2])
  end
end
`;
const putScript =
  prelude +
  `
local now, retention = tonumber(ARGV[1]), tonumber(ARGV[2])
local maxBytes, maxEntries = tonumber(ARGV[3]), tonumber(ARGV[4])
-- Include allocator RSS and other server memory, not only our charged payload.
-- ARGV[5] is 0 when this worker checked recently: INFO is parsed as text
-- inside the script, and every other client waits while a script runs.
local used, rss = 0, 0
if tonumber(ARGV[5]) > 0 then
  local info = redis.call('INFO', 'memory')
  used = tonumber(string.match(info, 'used_memory:(%d+)') or '0')
  rss = tonumber(string.match(info, 'used_memory_rss:(%d+)') or '0')
end
if tonumber(ARGV[5]) > 0 and math.max(used, rss) >= tonumber(ARGV[5]) then
  -- Reclaim only our oldest answers. Bound each pass so pressure cannot stall Redis.
  local reclaimed = 0
  for _, key in ipairs(redis.call('ZRANGE', lru, 0, 511)) do
    local before = bytes
    remove(key)
    reclaimed = reclaimed + before - bytes
    if reclaimed >= 4194304 then break end
  end
  finish()
  return bytes
end
local expired = redis.call('ZRANGEBYSCORE', lru, '-inf', (now - retention) * 1000, 'LIMIT', 0, 512)
for _, key in ipairs(expired) do remove(key) end
for i = 6, #ARGV, 2 do
  local key, value = ARGV[i], ARGV[i + 1]
  local old = redis.call('HGET', data, key)
  local incoming = cjson.decode(value)
  local existing = old and cjson.decode(old) or nil
  local size = string.len(value) + string.len(key) + 1024
  if size <= maxBytes and now - incoming.fetchedAt < retention
    and (not existing or incoming.fetchedAt >= existing.fetchedAt) then
    remove(key)
    redis.call('HSET', data, key, value)
    touch(key)
    bytes = bytes + size
    while bytes > maxBytes or redis.call('ZCARD', lru) > maxEntries do
      local oldest = redis.call('ZRANGE', lru, 0, 0)[1]
      if not oldest then break end
      remove(oldest)
    end
  end
end
finish()
return bytes
`;
const removeScript =
  prelude +
  `
for i = 3, #ARGV do remove(ARGV[i]) end
finish()
return bytes
`;

/** Redis is expendable public data. SQL remains the only refresh lease authority. */
export function createRedisCatalogCache(
  redis: CatalogRedis,
  {
    namespace = "{uloggd:igdb:v1}",
    maxBytes = 416 * 1024 * 1024,
    maxEntries = 200_000,
    maxServerBytes = 432 * 1024 * 1024,
    retentionMs = 7 * 24 * 60 * 60 * 1000,
    now = Date.now,
  } = {},
): CatalogAcceleration {
  const keys = [namespace + ":data", namespace + ":lru"];
  const args = () => [String(now()), String(retentionMs)];
  // The memory check is a sample, not a guarantee, so once every half minute
  // per worker is as good as on every write and much cheaper.
  let checkedMemoryAt = 0;
  function validate(key: string) {
    if (!key || key.length > 200 || key.startsWith("__"))
      throw new Error("Invalid catalogue cache key");
  }
  return {
    /**
     * A plain HMGET, decoded here.
     *
     * Reading used to be a Lua script that decoded every stored answer inside
     * Redis to look at its timestamp, then wrote a recency score for each key
     * it returned and rewrote the namespace counters on the way out. Every
     * lookup was also a write, and Redis runs one script at a time, so every
     * page waited on every other page's bookkeeping. Recency is now the time
     * an answer was written, which is when it was last refreshed: close enough
     * for a cache of answers that are refreshed on a schedule anyway.
     */
    async read(wanted) {
      wanted.forEach(validate);
      const answer = new Map<string, CatalogEntry>();
      if (!wanted.length) return answer;
      const batches: string[][] = [];
      for (let start = 0; start < wanted.length; start += 64) {
        batches.push(wanted.slice(start, start + 64));
      }
      let returnedBytes = 0;
      const at = now();
      await mapCatalogQueries(batches, async (batch) => {
        const values = await redis.hmGet(keys[0], batch);
        if (!Array.isArray(values) || values.length !== batch.length)
          throw new Error("Invalid Redis catalogue response");
        await mapCatalogQueries(
          values.map((value, index) => ({ value, key: batch[index] })),
          async ({ value, key }) => {
            if (typeof value !== "string") return;
            const stored: CatalogEntry & {
              compressed?: string;
              rawBytes?: number;
            } = JSON.parse(value);
            // Too old to serve is a miss. The next write prunes it.
            if (at - stored.fetchedAt >= retentionMs) return;
            // The response ceiling the script used to enforce, kept here.
            const size = stored.rawBytes ?? Buffer.byteLength(value);
            if (returnedBytes + size > MAX_DECODED_ENTRY) return;
            returnedBytes += size;
            const entry: CatalogEntry = {
              value:
                typeof stored.compressed === "string"
                  ? JSON.parse(
                      (
                        await decompress(
                          Buffer.from(stored.compressed, "base64"),
                          { maxOutputLength: MAX_DECODED_ENTRY },
                        )
                      ).toString("utf8"),
                    )
                  : stored.value,
              fetchedAt: stored.fetchedAt,
              retryAt: stored.retryAt,
              error: stored.error,
            };
            if (
              !Array.isArray(entry.value) ||
              !Number.isFinite(entry.fetchedAt) ||
              !Number.isFinite(entry.retryAt)
            )
              throw new Error("Invalid Redis catalogue entry");
            answer.set(key, entry);
          },
        );
      });
      return answer;
    },
    async put(entries) {
      // Bound command size as well as retained memory. Oversized answers stay in SQL.
      let batch: string[] = [];
      let size = 0;
      async function flush() {
        if (!batch.length) return;
        const checkMemory = now() - checkedMemoryAt >= 30_000;
        if (checkMemory) checkedMemoryAt = now();
        await redis.eval(putScript, {
          keys,
          arguments: [
            ...args(),
            String(maxBytes),
            String(maxEntries),
            checkMemory ? String(maxServerBytes) : "0",
            ...batch,
          ],
        });
        batch = [];
        size = 0;
      }
      for (const [key, entry] of entries) {
        validate(key);
        if (!Array.isArray(entry.value)) continue;
        let encoded = JSON.stringify({
          ...entry,
          retryAt: Number.isFinite(entry.retryAt) ? entry.retryAt : 0,
        });
        const rawBytes = Buffer.byteLength(encoded);
        if (rawBytes > MAX_DECODED_ENTRY) continue;
        if (rawBytes >= 2048) {
          const compressed = await compress(
            Buffer.from(JSON.stringify(entry.value)),
            { level: 1 },
          );
          const packed = JSON.stringify({
            fetchedAt: entry.fetchedAt,
            retryAt: Number.isFinite(entry.retryAt) ? entry.retryAt : 0,
            error: entry.error,
            rawBytes,
            compressed: compressed.toString("base64"),
          });
          if (Buffer.byteLength(packed) < rawBytes) encoded = packed;
        }
        const bytes = Buffer.byteLength(encoded);
        if (
          bytes > MAX_DECODED_ENTRY ||
          bytes + Buffer.byteLength(key) + 1024 > maxBytes
        )
          continue;
        // Small enough that the script finishes in a few milliseconds. Every
        // lookup from every worker waits while a script runs.
        // `batch` holds a key and a value per entry, so its length is twice
        // the number of answers in it.
        if (size + bytes > 96 * 1024 || batch.length / 2 >= 64) await flush();
        batch.push(key, encoded);
        size += bytes;
      }
      await flush();
    },
    async remove(wanted) {
      wanted.forEach(validate);
      if (wanted.length)
        await redis.eval(removeScript, {
          keys,
          arguments: [...args(), ...wanted],
        });
    },
  };
}

/** A Redis outage never creates a separate coordination domain or loses data. */
export function accelerateCatalogStore(
  durable: CatalogStore,
  redis: CatalogAcceleration,
  onError: (error: unknown) => void = () => {},
  now = Date.now,
  defer?: (task: () => Promise<void>) => void,
): CatalogStore {
  let pending = 0;
  async function optional(task: () => Promise<void>) {
    if (defer) {
      // Acceleration is expendable. Bound retained tasks during a slow outage.
      if (pending >= 4) return;
      pending++;
      try {
        defer(async () => {
          try {
            await task();
          } catch (error) {
            onError(error);
          } finally {
            pending--;
          }
        });
      } catch (error) {
        pending--;
        onError(error);
      }
      return;
    }
    try {
      await task();
    } catch (error) {
      onError(error);
    }
  }
  return {
    async read(keys, freshTtlMs) {
      let answer = new Map<string, CatalogEntry>();
      try {
        answer = await redis.read(keys);
      } catch (error) {
        onError(error);
      }
      // Refresh coordination must see newer durable answers even if a Redis
      // write was skipped under memory pressure or failed in another worker.
      const missing = keys.filter((key) => {
        const entry = answer.get(key);
        return (
          !entry ||
          (freshTtlMs !== undefined && now() - entry.fetchedAt >= freshTtlMs)
        );
      });
      if (missing.length) {
        const saved = await durable.read(missing);
        for (const [key, entry] of saved) answer.set(key, entry);
        // Do not retain an unbounded durable response in background callbacks.
        const fill = new Map<string, CatalogEntry>();
        let bytes = 0;
        for (const [key, entry] of saved) {
          const size = Buffer.byteLength(JSON.stringify(entry));
          if (size > MAX_DECODED_ENTRY || bytes + size > MAX_DECODED_ENTRY)
            continue;
          fill.set(key, entry);
          bytes += size;
          if (fill.size >= 128) break;
        }
        if (fill.size) await optional(() => redis.put(fill));
      }
      return answer;
    },
    claim: (keys, ttl) => durable.claim(keys, ttl),
    async write(claims, values) {
      await durable.write(claims, values);
      // The answers are in hand. Reading them back from PostgreSQL to copy
      // them into Redis was a second database round trip for nothing.
      const fetchedAt = now();
      const fill = new Map<string, CatalogEntry>();
      for (const { key } of claims.slice(0, 128)) {
        const value = values.get(key);
        if (Array.isArray(value))
          fill.set(key, { value, fetchedAt, retryAt: 0, error: null });
      }
      if (fill.size) await optional(() => redis.put(fill));
    },
    async fail(claims, error) {
      await durable.fail(claims, error);
      await optional(() => redis.remove(claims.map(({ key }) => key)));
    },
  };
}
