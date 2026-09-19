import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * IGDB's budget: four requests a second for the whole deployment.
 *
 * Each worker used to keep its own third and space every request 750ms apart,
 * so a game page's four lookups spent two seconds in line on an idle site. The
 * budget now lives once, in the cluster primary, and lets a page's lookups go
 * together while still never passing four in a second.
 */

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { createBudget } = require(path.join(ROOT, "igdb-budget.js")) as {
  createBudget: (options: {
    limit?: number;
    windowMs?: number;
    now?: () => number;
  }) => { take: () => number; hold: (ms: number) => void };
};

function clock() {
  let at = 1_000_000;
  return {
    now: () => at,
    advance: (ms: number) => {
      at += ms;
    },
  };
}

test("an idle budget sends a page's four lookups at once", () => {
  const time = clock();
  const budget = createBudget({ limit: 4, now: time.now });
  assert.deepEqual(
    [budget.take(), budget.take(), budget.take(), budget.take()],
    [0, 0, 0, 0],
  );
});

test("the fifth request in a second waits for the budget to refill", () => {
  const time = clock();
  const budget = createBudget({ limit: 4, now: time.now });
  for (let index = 0; index < 4; index += 1) budget.take();
  assert.equal(budget.take(), 1000);
  assert.equal(budget.take(), 1000);
  time.advance(400);
  assert.equal(budget.take(), 600);
});

test("no window of one second ever holds more than four sends", () => {
  const time = clock();
  const budget = createBudget({ limit: 4, now: time.now });
  const sends: number[] = [];
  // Twenty requests from three workers, arriving in a jumble.
  for (let index = 0; index < 20; index += 1) {
    time.advance(index % 3 === 0 ? 90 : 10);
    sends.push(time.now() + budget.take());
  }
  sends.sort((a, b) => a - b);
  for (const start of sends) {
    const inWindow = sends.filter((at) => at >= start && at < start + 1000);
    assert.ok(inWindow.length <= 4, `${inWindow.length} sends in one second`);
  }
});

test("a 429 holds every later request back", () => {
  const time = clock();
  const budget = createBudget({ limit: 4, now: time.now });
  budget.hold(1600);
  assert.equal(budget.take(), 1600);
  time.advance(1600);
  assert.equal(budget.take(), 0);
});

test("the cluster primary hands out the one budget", async () => {
  const server = await readFile(path.join(ROOT, "server.js"), "utf8");
  const igdb = await readFile(path.join(ROOT, "lib", "igdb.ts"), "utf8");
  assert.match(server, /createBudget\(/);
  assert.match(server, /uloggd:igdb-slot/);
  assert.match(igdb, /uloggd:igdb-slot/);
  assert.match(igdb, /uloggd:igdb-hold/);
  // No per-worker spacing left that would still add the waits up.
  assert.doesNotMatch(igdb, /MIN_GAP_MS/);
});
