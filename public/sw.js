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
const VERSION = "v2";
const SHELL_CACHE = `uloggd-shell-${VERSION}`;
const ASSET_CACHE = `uloggd-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Precaching must never decide whether this worker exists. `cache.add`
      // rejects on any non-ok response, and a rejection inside `waitUntil`
      // fails the install outright: no worker, no offline page, and no install
      // option in the browser either, since that requires a live worker. One
      // challenged request for one fallback page would take the whole feature
      // down, and the page is an enhancement.
      try {
        const cache = await caches.open(SHELL_CACHE);
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch {
        // Retried opportunistically on the first navigation that succeeds.
      }
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

/** Stores the offline page if it is not already there. Never throws. */
async function cacheOfflinePage() {
  try {
    const cache = await caches.open(SHELL_CACHE);
    if (await cache.match(OFFLINE_URL)) return;
    await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
  } catch {
    // Offline again, or refused again. Tried once more next navigation.
  }
}

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
          const response = await fetch(request);
          // Second chance at the fallback: if precaching was refused at install
          // time, a working navigation is proof the network is reachable now.
          void cacheOfflinePage();
          return response;
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

/**
 * A push arrived. The payload is written by our own dispatch route, but it is
 * still parsed defensively: a malformed one must not take down the handler, or
 * the browser records a failed push and may revoke the subscription.
 */
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = {};
      }
      const title = data.title || "uloggd";
      await self.registration.showNotification(title, {
        body: data.body || "",
        // Whoever caused the notification, when the payload carries them.
        // Knowing who it is from is worth more than being reminded which app
        // it is, which the badge beside it already says.
        icon: data.icon || "/icons/icon-192.png",
        // Android draws the badge from the alpha channel alone and paints the
        // result a flat colour, so an opaque image becomes a solid square.
        // This one is the mark as a transparent silhouette, which is the only
        // shape that survives that treatment.
        badge: "/icons/badge-96.png",
        // Collapses repeats of the same notification rather than stacking them.
        tag: data.tag || undefined,
        data: { url: data.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      // Focuses an open tab instead of opening a second one, which is what
      // someone expects when the app is already running behind the lock screen.
      const open = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of open) {
        if (client.url.includes(target) && "focus" in client)
          return client.focus();
      }
      if (open.length > 0 && "navigate" in open[0]) {
        await open[0].focus();
        return open[0].navigate(target);
      }
      return self.clients.openWindow(target);
    })(),
  );
});
