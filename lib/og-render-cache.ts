/** Public share images only. The cache holds rendered bytes, never account sessions. */
export function createOgRenderCache({
  maxBytes = 8 * 1024 * 1024,
  maxEntries = 32,
  ttlMs = 60 * 60 * 1000,
  now = Date.now,
} = {}) {
  type Image = { bytes: ArrayBuffer; headers: Headers; expiresAt: number };
  const entries = new Map<string, Image>();
  const pending = new Map<string, Promise<Image>>();
  let bytes = 0;
  function remove(key: string) {
    const old = entries.get(key);
    if (old) bytes -= old.bytes.byteLength;
    entries.delete(key);
  }
  return async function render(key: string, generate: () => Response) {
    let image = entries.get(key);
    if (image && image.expiresAt <= now()) {
      remove(key);
      image = undefined;
    }
    if (image) {
      entries.delete(key);
      entries.set(key, image);
    } else {
      let work = pending.get(key);
      if (!work) {
        work = (async () => {
          const response = generate();
          if (!response.ok) throw new Error("Share image rendering failed");
          const rendered = {
            bytes: await response.arrayBuffer(),
            headers: new Headers(response.headers),
            expiresAt: now() + ttlMs,
          };
          for (const [id, entry] of entries) {
            if (entry.expiresAt <= now()) remove(id);
          }
          if (rendered.bytes.byteLength <= maxBytes) {
            remove(key);
            entries.set(key, rendered);
            bytes += rendered.bytes.byteLength;
            while (entries.size > maxEntries || bytes > maxBytes)
              remove(entries.keys().next().value!);
          }
          return rendered;
        })();
        // Coalesce repeat crawlers without retaining an unbounded list of requests.
        if (pending.size < 32) pending.set(key, work);
      }
      try {
        image = await work;
      } finally {
        if (pending.get(key) === work) pending.delete(key);
      }
    }
    return new Response(image.bytes.slice(0), { headers: image.headers });
  };
}
