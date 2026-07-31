/**
 * Offline shell for uloggd.
 *
 * Written by hand rather than pulled from a plugin: the ones that do this for
 * Next require webpack configuration, and the caching rules an app needs are
 * short enough to read in one sitting. Being able to read them matters, because
 * a service worker that caches the wrong thing serves stale pages to users with
 * no obvious way for them to recover.
 *
 * Three rules, by request type:
 *
 * - Navigations go to the network first. A social feed that shows yesterday's
 *   posts because they were cached is worse than one that says it is offline,
 *   so the cache is a fallback and never a shortcut.
 * - Build assets under /_next/static are content-hashed, so their filename
 *   changes whenever their content does. Those are safe to serve from cache
 *   immediately and refresh in the background.
 * - Everything else, including API calls and images from other origins, is left
 *   alone. Caching a signed URL or a personalised response would hand one
 *   viewer's data to the next one on a shared device.
 */
const VERSION = "v1";
const SHELL_CACHE = `uloggd-shell-${VERSION}`;
const ASSET_CACHE = `uloggd-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      // Takes over on the next load rather than waiting for every tab to
      // close, so a fix to this file reaches people the same day.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      // Drops caches from older versions, otherwise every release leaves its
      // assets behind and the storage quota fills up until eviction is forced.
      await Promise.all(
        (await caches.keys())
          .filter((name) => name.startsWith("uloggd-") && !keep.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function isBuildAsset(url) {
  return (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          // Only reached with no connection at all: a 404 or a 500 is a real
          // response and belongs to the app, not to this file.
          const cache = await caches.open(SHELL_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ?? new Response("", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
    return;
  }

  if (isBuildAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        // Opaque and error responses are not worth storing: an opaque one
        // cannot be inspected, and caching an error makes it permanent.
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});

/**
 * Lets the page ask a waiting worker to take over immediately, which is what
 * the update prompt in the app calls.
 */
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
