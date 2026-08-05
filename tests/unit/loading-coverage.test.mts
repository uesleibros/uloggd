import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * What a page shows while it waits.
 *
 * The first version of this file asserted that every fetching page has a
 * `loading.tsx` near it, and it could never have failed: `app/[lang]` has one,
 * Next walks up to the nearest ancestor, so everything is covered by it and
 * the check was vacuous. Finding that also corrected the claim it was written
 * from. Routes without their own skeleton were never leaving the previous page
 * on screen; they were falling back to the home page's shape, which is a
 * different and much smaller problem.
 *
 * So this asserts the two things that are actually true and actually worth
 * holding: the root fallback exists, because deleting it would take the wait
 * state away from every route at once, and the workspaces that look nothing
 * like the home page have their own.
 */
const APP_ROOT = path.join(process.cwd(), "app", "[lang]");

test("the locale root has a skeleton every route can fall back to", async () => {
  const entries = await readdir(APP_ROOT);
  assert.ok(
    entries.includes("loading.tsx"),
    "app/[lang]/loading.tsx is gone, so any route without its own now navigates with nothing on screen",
  );
});

test("workspaces that look nothing like Home draw their own", async () => {
  // Falling back to the home page's shape means the layout jumps when the real
  // content lands: a gallery of covers is not a feed, and a wallet is neither.
  // Listed by name because "looks different enough to need its own" is a
  // judgement, and a judgement written down is one somebody can argue with.
  const owed = [
    "library/[username]",
    "lists/[id]",
    "reviews/[username]",
    "shots/[username]",
    "wallet/[username]",
    "u/[username]",
  ];
  const missing: string[] = [];
  for (const route of owed) {
    const entries = await readdir(path.join(APP_ROOT, ...route.split("/")));
    if (!entries.includes("loading.tsx")) missing.push(route);
  }
  assert.deepEqual(
    missing,
    [],
    `these fall back to the home page's shape:\n${missing.join("\n")}`,
  );
});

test("a skeleton that re-exports another one points somewhere real", async () => {
  // `/shots` and `/wallet` resolve the viewer's own username and then render
  // the same workspace, so they re-export its skeleton rather than copy it. A
  // re-export of a file that has moved fails the build, but only once someone
  // navigates there, so it is worth catching here.
  for (const route of ["shots", "wallet"]) {
    const file = path.join(APP_ROOT, route, "loading.tsx");
    const source = await readFile(file, "utf8");
    const target = /from "(\.[^"]+)"/.exec(source)?.[1];
    if (!target) continue;
    const resolved = path.join(APP_ROOT, route, `${target}.tsx`);
    const entries = await readdir(path.dirname(resolved));
    assert.ok(
      entries.includes(path.basename(resolved)),
      `${route}/loading.tsx re-exports ${target}, which does not exist`,
    );
  }
});
