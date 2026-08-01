import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

/**
 * The service worker's caching rules, exercised rather than read.
 *
 * A service worker is the one script that can keep serving its own old
 * behaviour after it has been fixed, so a mistake here does not look like a
 * bug, it looks like the site being broken for a subset of people who cannot
 * explain why. That makes it worth testing, and it is plain JavaScript with
 * three event handlers, so it can run in a fake global scope instead of
 * needing a browser. Playwright cannot run on this machine at all.
 *
 * The fakes below implement only what the worker actually touches, so a rule
 * that starts depending on something new fails loudly rather than silently
 * passing against a mock that agreed with it.
 */
type Handlers = Record<string, ((event: unknown) => void)[]>;

class FakeResponse {
  constructor(
    public body: string,
    public init: { status?: number; url?: string } = {},
  ) {}
  get status() {
    return this.init.status ?? 200;
  }
  get ok() {
    return this.status >= 200 && this.status < 300;
  }
  clone() {
    return new FakeResponse(this.body, this.init);
  }
}

class FakeCache {
  store = new Map<string, FakeResponse>();
  /**
   * Fetches, and rejects on a non-ok response, like the real Cache API. The
   * first version of this stored a made-up response without fetching, which
   * made the test for a refused precache pass without refusing anything.
   */
  constructor(
    private fetcher: (request: {
      url: string;
    }) => Promise<FakeResponse> = async (request) =>
      new FakeResponse(`cached:${request.url}`),
  ) {}
  async add(request: { url: string } | string) {
    const url = typeof request === "string" ? request : request.url;
    const response = await this.fetcher({ url });
    if (!response.ok)
      throw new TypeError(`Request failed with status ${response.status}`);
    this.store.set(url, response);
  }
  async match(request: { url: string } | string) {
    const url = typeof request === "string" ? request : request.url;
    return this.store.get(url);
  }
  async put(request: { url: string } | string, response: FakeResponse) {
    const url = typeof request === "string" ? request : request.url;
    this.store.set(url, response);
  }
}

/** Boots the worker in a fresh scope and returns handles to poke at it. */
async function loadWorker(options: { existingCaches?: string[] } = {}) {
  const source = await readFile(
    path.join(process.cwd(), "public", "sw.js"),
    "utf8",
  );

  const handlers: Handlers = {};
  const caches = new Map<string, FakeCache>();
  const deleted: string[] = [];
  let claimed = false;
  let skipped = 0;

  const fetchCalls: string[] = [];
  let fetchImpl: (request: { url: string }) => Promise<FakeResponse> = async (
    request,
  ) => new FakeResponse(`network:${request.url}`, { url: request.url });
  const cacheFetcher = (request: { url: string }) => fetchImpl(request);
  for (const name of options.existingCaches ?? [])
    caches.set(name, new FakeCache(cacheFetcher));

  const self = {
    location: { origin: "https://uloggd.app" },
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      (handlers[type] ??= []).push(handler);
    },
    skipWaiting: async () => {
      skipped += 1;
    },
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
    registration: {},
  };

  const context = vm.createContext({
    self,
    caches: {
      open: async (name: string) => {
        if (!caches.has(name)) caches.set(name, new FakeCache(cacheFetcher));
        return caches.get(name)!;
      },
      keys: async () => [...caches.keys()],
      delete: async (name: string) => {
        deleted.push(name);
        return caches.delete(name);
      },
    },
    fetch: async (request: { url: string }) => {
      fetchCalls.push(request.url);
      return fetchImpl(request);
    },
    Request: class {
      url: string;
      constructor(url: string) {
        this.url = url;
      }
    },
    Response: FakeResponse,
    URL,
    Promise,
    console,
  });
  vm.runInContext(source, context);

  /** Dispatches an event and resolves whatever the handler passed to waitUntil/respondWith. */
  async function dispatch(type: string, event: Record<string, unknown>) {
    let pending: Promise<unknown> | undefined;
    let responded: Promise<unknown> | undefined;
    const full = {
      ...event,
      waitUntil: (value: Promise<unknown>) => {
        pending = value;
      },
      respondWith: (value: Promise<unknown>) => {
        responded = value;
      },
    };
    for (const handler of handlers[type] ?? []) handler(full);
    if (pending) await pending;
    return responded ? await responded : undefined;
  }

  return {
    dispatch,
    caches,
    deleted,
    fetchCalls,
    get claimed() {
      return claimed;
    },
    get skipped() {
      return skipped;
    },
    setFetch(impl: typeof fetchImpl) {
      fetchImpl = impl;
    },
  };
}

test("install precaches the offline page", async () => {
  const worker = await loadWorker();
  await worker.dispatch("install", {});

  const shell = [...worker.caches.entries()].find(([name]) =>
    name.includes("shell"),
  );
  assert.ok(shell, "no shell cache was opened");
  assert.ok(
    [...shell[1].store.keys()].some((url) => url.includes("offline.html")),
    "the offline page was not precached, so there is nothing to fall back to",
  );
  assert.equal(worker.skipped, 1, "a fix would wait for every tab to close");
});

test("activate drops caches from older versions and keeps the current ones", async () => {
  const worker = await loadWorker({
    existingCaches: [
      "uloggd-shell-v0",
      "uloggd-assets-v0",
      "something-else-entirely",
    ],
  });
  await worker.dispatch("install", {});
  await worker.dispatch("activate", {});

  assert.ok(
    worker.deleted.includes("uloggd-shell-v0"),
    "old caches survive, so every release leaks storage until eviction",
  );
  assert.ok(worker.deleted.includes("uloggd-assets-v0"));
  assert.ok(
    !worker.deleted.includes("something-else-entirely"),
    "the worker deleted a cache that is not its own",
  );
  assert.ok(worker.claimed, "the worker never took control of open pages");
});

test("a navigation is served from the network, not the cache", async () => {
  const worker = await loadWorker();
  await worker.dispatch("install", {});

  // Seeded deliberately: without a cached copy of this exact URL, a cache-first
  // worker would miss and fall through to the network, and this test would pass
  // against the very mistake it exists to catch. Verified by introducing that
  // mistake, which this now fails on and previously did not.
  const shell = [...worker.caches.entries()].find(([name]) =>
    name.includes("shell"),
  );
  assert.ok(shell, "no shell cache was opened");
  shell[1].store.set(
    "https://uloggd.app/pt-BR",
    new FakeResponse("stale:yesterday"),
  );

  const response = (await worker.dispatch("fetch", {
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://uloggd.app/pt-BR",
    },
  })) as FakeResponse;

  assert.match(
    response.body,
    /^network:/,
    "a feed served from cache shows yesterday's posts as if they were today's",
  );
});

test("a navigation with no connection falls back to the offline page", async () => {
  const worker = await loadWorker();
  await worker.dispatch("install", {});
  worker.setFetch(async () => {
    throw new TypeError("Failed to fetch");
  });

  const response = (await worker.dispatch("fetch", {
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://uloggd.app/pt-BR",
    },
  })) as FakeResponse;

  assert.match(
    response.body,
    /offline\.html/,
    "an offline navigation returned nothing usable",
  );
});

test("build assets are served from cache after the first request", async () => {
  const worker = await loadWorker();
  await worker.dispatch("install", {});
  const request = {
    method: "GET",
    mode: "no-cors",
    url: "https://uloggd.app/_next/static/chunks/main-abc123.js",
  };

  await worker.dispatch("fetch", { request });
  const callsAfterFirst = worker.fetchCalls.length;
  const second = (await worker.dispatch("fetch", { request })) as FakeResponse;

  assert.equal(
    worker.fetchCalls.length,
    callsAfterFirst,
    "a hashed asset was fetched twice, so the cache is doing nothing",
  );
  assert.match(second.body, /network:/, "the cached copy was not returned");
});

test("a failed asset response is not cached", async () => {
  // Caching an error makes it permanent: the file would keep failing for that
  // user long after the deploy that broke it was rolled back.
  const worker = await loadWorker();
  await worker.dispatch("install", {});
  worker.setFetch(
    async (request) =>
      new FakeResponse("boom", { status: 500, url: request.url }),
  );

  const request = {
    method: "GET",
    mode: "no-cors",
    url: "https://uloggd.app/_next/static/chunks/broken-def456.js",
  };
  await worker.dispatch("fetch", { request });

  const assets = [...worker.caches.entries()].find(([name]) =>
    name.includes("assets"),
  );
  assert.ok(
    !assets || assets[1].store.size === 0,
    "a 500 was written to the cache",
  );
});

test("API calls and cross-origin requests are left alone", async () => {
  const worker = await loadWorker();
  await worker.dispatch("install", {});

  for (const url of [
    "https://uloggd.app/api/activity",
    "https://images.igdb.com/igdb/image/upload/cover.jpg",
    "https://uloggd.app/pt-BR/u/someone",
  ]) {
    const response = await worker.dispatch("fetch", {
      request: { method: "GET", mode: "no-cors", url },
    });
    assert.equal(
      response,
      undefined,
      `${url} was intercepted, which risks serving one viewer's data to the next`,
    );
  }
});

test("mutating requests are never intercepted", async () => {
  const worker = await loadWorker();
  await worker.dispatch("install", {});

  const response = await worker.dispatch("fetch", {
    request: {
      method: "POST",
      mode: "cors",
      url: "https://uloggd.app/api/journal/images",
    },
  });
  assert.equal(response, undefined, "a POST passed through the worker");
});

test("install still completes when the offline page cannot be fetched", async () => {
  // `cache.add` rejects on any non-ok response, and a rejection inside
  // `waitUntil` fails the install: no worker at all. That matters beyond the
  // offline page, because a browser only offers to install a site that has a
  // live service worker, so one refused request for one fallback would take
  // the whole feature down.
  const worker = await loadWorker();
  worker.setFetch(async () => new FakeResponse("denied", { status: 403 }));

  await worker.dispatch("install", {});
  assert.equal(
    worker.skipped,
    1,
    "install aborted, so the worker never activates and nothing is installable",
  );
});

test("the offline page is cached on the first navigation that works", async () => {
  // Recovery for the case above: precaching was refused, but a navigation
  // succeeding is proof the network is reachable now.
  const worker = await loadWorker();
  worker.setFetch(async () => new FakeResponse("denied", { status: 403 }));
  await worker.dispatch("install", {});

  const shell = [...worker.caches.entries()].find(([name]) =>
    name.includes("shell"),
  );
  assert.ok(shell, "no shell cache was opened");
  assert.equal(shell[1].store.size, 0, "expected the precache to have failed");

  worker.setFetch(
    async (request) =>
      new FakeResponse(`network:${request.url}`, { url: request.url }),
  );
  await worker.dispatch("fetch", {
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://uloggd.app/pt-BR",
    },
  });
  // The retry is fired without being awaited by the response, so let it settle.
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.ok(
    [...shell[1].store.keys()].some((url) => url.includes("offline.html")),
    "the fallback never recovered, so this user has no offline page at all",
  );
});

test("the manifest is linked with credentials and served as a static file", async () => {
  // Both details were needed to make the browser fetch it at all behind a
  // protection layer, and neither is expressible through Next's Metadata API,
  // so a later refactor back to `app/manifest.ts` would silently undo them.
  // The symptom gives nothing away: an empty manifest and no install offer.
  const layout = await readFile(
    path.join(process.cwd(), "app", "[lang]", "layout.tsx"),
    "utf8",
  );
  assert.match(
    layout,
    /rel="manifest"[\s\S]{0,120}crossOrigin="use-credentials"/,
    "the manifest link lost its credentials, so the fetch goes out cookieless",
  );
  assert.match(
    layout,
    /href="\/manifest\.json"/,
    "the manifest link no longer points at the static file",
  );

  const manifest = JSON.parse(
    await readFile(path.join(process.cwd(), "public", "manifest.json"), "utf8"),
  );
  for (const key of ["name", "short_name", "start_url", "display", "icons"])
    assert.ok(manifest[key], `the manifest is missing ${key}`);
  assert.ok(
    manifest.icons.some((icon: { sizes?: string }) => icon.sizes === "512x512"),
    "installability needs a 512px icon",
  );
  assert.ok(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
    "without a maskable icon a round launcher mask clips the mark",
  );
});
