import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Every top-level route must be registered in the proxy.
 *
 * The proxy answers 404 for any first segment it does not recognise, before
 * the route is ever reached. That is deliberate: it is the only place left
 * that can set a real 404 status, since once the layout starts streaming the
 * headers are gone. The cost is that adding a route means adding it in two
 * places, and forgetting the second makes the new route invisible with no
 * error anywhere.
 *
 * That has now happened twice: `/shots` answered 404 for every URL when it was
 * added, and `/organizations` would have done the same. Both were found by
 * requesting the route rather than by reading anything, which is exactly the
 * kind of check worth automating.
 *
 * Reads the filesystem and the proxy source, so it needs no server and no
 * credentials.
 */
const APP_ROOT = path.join(process.cwd(), "app", "[lang]");

/** Directories under `app/[lang]` that actually serve something. */
async function routeSegments() {
  const entries = await readdir(APP_ROOT, { withFileTypes: true });
  const segments: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Dynamic segments are reached through a parent that is itself registered.
    if (entry.name.startsWith("[") || entry.name.startsWith("(")) continue;
    const children = await readdir(path.join(APP_ROOT, entry.name), {
      withFileTypes: true,
    });
    const servesSomething = children.some(
      (child) =>
        child.name === "page.tsx" ||
        child.name === "route.ts" ||
        child.isDirectory(),
    );
    if (servesSomething) segments.push(entry.name);
  }
  return segments;
}

test("every top-level route is known to the proxy", async () => {
  const proxy = await readFile(path.join(process.cwd(), "proxy.ts"), "utf8");

  // Both lists matter: `knownSegments` decides what exists at all, and it is
  // built from `publicSegments` plus a handful of authenticated ones.
  const declared = new Set(
    [...proxy.matchAll(/^\s*"([a-z-]+)",\s*$/gm)].map((match) => match[1]),
  );
  assert.ok(declared.size > 0, "parsed no segments out of the proxy");

  const missing = (await routeSegments()).filter(
    (segment) => !declared.has(segment),
  );
  assert.deepEqual(
    missing,
    [],
    `these routes exist but the proxy will answer 404 for them: ${missing.join(", ")}`,
  );
});

test("the proxy does not list segments that no longer exist", async () => {
  // The other direction. A stale entry is harmless on its own, but it makes
  // the list stop being a reliable answer to "what does this app serve", which
  // is the only reason to read it.
  const proxy = await readFile(path.join(process.cwd(), "proxy.ts"), "utf8");
  const knownBlock = proxy.match(
    /const knownSegments = new Set\(\[([\s\S]*?)\]\);/,
  );
  const publicBlock = proxy.match(
    /const publicSegments = new Set\(\[([\s\S]*?)\]\);/,
  );
  assert.ok(
    knownBlock && publicBlock,
    "the segment lists moved or were renamed",
  );

  const listed = [
    ...knownBlock[1].matchAll(/"([a-z-]+)"/g),
    ...publicBlock[1].matchAll(/"([a-z-]+)"/g),
  ].map((match) => match[1]);

  const existing = new Set(await routeSegments());
  // `not-found` is served through a rewrite rather than by being navigated to,
  // and the empty string stands for the language root.
  const exempt = new Set(["not-found", "auth", "explore"]);
  const stale = [
    ...new Set(
      listed.filter(
        (segment) => !existing.has(segment) && !exempt.has(segment),
      ),
    ),
  ];
  assert.deepEqual(
    stale,
    [],
    `the proxy lists segments with no route behind them: ${stale.join(", ")}`,
  );
});
