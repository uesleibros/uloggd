import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

/**
 * The catalogue is a service, and a service is sometimes unreachable.
 *
 * Production filled with `IGDB request failed (429)` and a digest beside it,
 * which is a five hundred handed to somebody. A rate limit upstream should
 * make a page slightly out of date, never broken, and a share card should
 * never be the thing that breaks: crawlers generate most of that traffic, so
 * a throw there comes back every few seconds until somebody notices.
 *
 * These read the source rather than the network, because the behaviour worth
 * protecting is a decision about failure, and a test that needs IGDB to be
 * down to run is a test nobody runs.
 */

test("a failed catalogue query falls back to the last good answer", async () => {
  const source = await readFile(path.join(ROOT, "lib/igdb.ts"), "utf8");
  assert.match(
    source,
    /const lastGood = new Map<string, unknown\[\]>\(\)/,
    "the last good answer to each query is kept",
  );
  assert.match(
    source,
    /const stale = lastGood\.get\(key\)[^\n]*\n\s*if \(!stale\) throw reason;/,
    "a failure serves the previous answer when there is one",
  );
  // Bounded: a map that only grows is a leak with a nice name.
  assert.match(source, /while \(lastGood\.size > LAST_GOOD_MAX\)/);
});

test("a rate limit is backed off and held for everybody", async () => {
  const source = await readFile(path.join(ROOT, "lib/igdb.ts"), "utf8");
  assert.match(source, /response\.status === 429/);
  assert.match(source, /Retry-After/);
  assert.match(
    source,
    /holdIgdb\(delay\)/,
    "one worker's 429 holds the rest back too",
  );
});

test("every share card that reads the catalogue is guarded", async () => {
  const cards = [
    "app/[lang]/game/[slug]/opengraph-image.tsx",
    "app/[lang]/entry/[id]/opengraph-image.tsx",
    "app/[lang]/journal/[id]/opengraph-image.tsx",
    "app/[lang]/review/[id]/opengraph-image.tsx",
    "app/[lang]/shot/[id]/opengraph-image.tsx",
  ];
  for (const card of cards) {
    const source = await readFile(path.join(ROOT, card), "utf8");
    assert.match(
      source,
      /safeOgResponse\(/,
      `${card} can still throw at a crawler`,
    );
    assert.doesNotMatch(
      source,
      /export default async function Image\(\{ params \}/,
      `${card} exports the unguarded card directly`,
    );
  }
});

test("the series asks for editions only when they can matter", async () => {
  const source = await readFile(path.join(ROOT, "lib/igdb.ts"), "utf8");
  assert.match(source, /withVersions = true/);
  assert.match(source, /const editions = !withVersions\s*\n?\s*\? \[\]/);
  const panel = await readFile(
    path.join(ROOT, "components/series-progress.tsx"),
    "utf8",
  );
  assert.match(
    panel,
    /getSeriesGames\(game\.series, signedIn\)/,
    "a signed-out reader has nothing for an edition to satisfy",
  );
});
