/**
 * The data cache, in memory, with a ceiling.
 *
 * Next's own handler writes every cached fetch to `.next/cache/fetch-cache`
 * as a file and never removes one. On this host that directory grew until the
 * container ran out of disk, and the only symptom was every render failing
 * with ENOSPC while trying to write the next entry. The catalogue is read from
 * IGDB with `unstable_cache`, so the number of distinct entries is the number
 * of distinct queries anybody has ever made: it has no bound and never will.
 *
 * Memory does have a bound, so this keeps entries there and throws the oldest
 * away when the total passes the cap. Nothing is written to disk.
 *
 * Each worker keeps its own copy, which is the trade: three workers can each
 * fetch the same thing once instead of sharing one answer. That is at most two
 * extra IGDB requests per cold key, and they pass through the same shared
 * budget as everything else, so it cannot turn into a burst.
 */

const MAX_BYTES =
  Math.max(4, Number(process.env.ULOGGD_CACHE_MB) || 48) * 1048576;
/** Nothing is worth keeping longer than this, whatever its own revalidate. */
const MAX_AGE_MS =
  Math.max(1, Number(process.env.ULOGGD_CACHE_HOURS) || 6) * 3600000;

/** Insertion order is the eviction order: a read moves its key to the end. */
const store = new Map();
let held = 0;

function sizeOf(data) {
  try {
    // An estimate, not a measurement. It only has to be proportional, since
    // it decides which entry goes first and when to stop, not what is billed.
    return JSON.stringify(data).length * 2;
  } catch {
    return 65536;
  }
}

function drop(key) {
  const entry = store.get(key);
  if (!entry) return;
  held -= entry.bytes;
  store.delete(key);
}

function evictWhileOver() {
  for (const key of store.keys()) {
    if (held <= MAX_BYTES) return;
    drop(key);
  }
}

module.exports = class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.lastModified > MAX_AGE_MS) {
      drop(key);
      return null;
    }
    // Touched, so the least recently used is the one at the front.
    store.delete(key);
    store.set(key, entry);
    return {
      value: entry.value,
      lastModified: entry.lastModified,
      tags: entry.tags,
    };
  }

  async set(key, data, ctx) {
    drop(key);
    if (data === null || data === undefined) return;
    const bytes = sizeOf(data);
    // One entry larger than the whole cache is not worth emptying it for.
    if (bytes > MAX_BYTES) return;
    store.set(key, {
      value: data,
      lastModified: Date.now(),
      tags: (ctx && ctx.tags) || [],
      bytes,
    });
    held += bytes;
    evictWhileOver();
  }

  async revalidateTag(tags) {
    const wanted = new Set([tags].flat());
    for (const [key, entry] of store)
      if (entry.tags.some((tag) => wanted.has(tag))) drop(key);
  }

  resetRequestCache() {}
};
