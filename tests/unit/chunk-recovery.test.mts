import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  CHUNK_RECOVERY_STORAGE_KEY,
  chunkRecoveryBootstrapScript,
} from "../../lib/chunk-recovery.ts";

type Listener = (event: Record<string, unknown>) => void;

function runBootstrap(initialStorage?: string) {
  const listeners = new Map<string, Listener[]>();
  const storage = new Map<string, string>();
  if (initialStorage) storage.set(CHUNK_RECOVERY_STORAGE_KEY, initialStorage);
  let reloads = 0;

  const window = {
    location: {
      reload: () => {
        reloads += 1;
      },
    },
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    addEventListener: (type: string, listener: Listener) => {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    },
  };

  vm.runInNewContext(chunkRecoveryBootstrapScript, { window });

  return {
    dispatch(type: string, event: Record<string, unknown>) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    storage,
    get reloads() {
      return reloads;
    },
  };
}

test("reloads once when Turbopack cannot load an old deployment chunk", () => {
  const browser = runBootstrap();
  const message =
    "ChunkLoadError: Failed to load chunk /_next/static/chunks/old-build.js from module 964893";

  browser.dispatch("unhandledrejection", {
    reason: { name: "ChunkLoadError", message },
  });
  browser.dispatch("unhandledrejection", {
    reason: { name: "ChunkLoadError", message },
  });

  assert.equal(browser.reloads, 1);
  assert.equal(
    browser.storage.get(CHUNK_RECOVERY_STORAGE_KEY),
    "/_next/static/chunks/old-build.js",
  );
});

test("detects a failed Next chunk from the script element URL", () => {
  const browser = runBootstrap();

  browser.dispatch("error", {
    message: "",
    target: {
      src: "https://uloggd.com/_next/static/chunks/missing-script.js",
    },
  });

  assert.equal(browser.reloads, 1);
});

test("does not reload for unrelated browser or application errors", () => {
  const browser = runBootstrap();

  browser.dispatch("error", {
    message: "net::ERR_BLOCKED_BY_CLIENT",
    target: { src: "https://static.cloudflareinsights.com/beacon.min.js" },
  });
  browser.dispatch("unhandledrejection", {
    reason: new Error("The API request failed"),
  });

  assert.equal(browser.reloads, 0);
});

test("does not loop when the same chunk remains unavailable after reload", () => {
  const signature = "/_next/static/chunks/still-missing.js";
  const browser = runBootstrap(signature);

  browser.dispatch("error", {
    message: `Failed to load chunk ${signature}`,
  });

  assert.equal(browser.reloads, 0);
});
