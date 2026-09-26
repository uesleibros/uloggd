import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

/**
 * Playing is its own flag, and every reader has to agree about that.
 *
 * These used to say the opposite: `status` was the single source of truth and
 * `playing` was a compatibility boolean kept in step with it. That fixed a
 * real bug at the time, and caused a worse one, because it meant marking a
 * game as played switched off "I am playing this". A replay is the one case
 * where somebody needs to say both, and it is not rare.
 *
 * So the rule is inverted, and written down here rather than left to be
 * rediscovered: a shelf, a counter or a filter that means "being played now"
 * reads `playing`. A status still moves the flag when it names PLAYING, which
 * is what the importer and every client written before the split send.
 */

test("shelves, counters and filters read the flag", async () => {
  const cases: [file: string, pattern: RegExp][] = [
    ["app/api/v1/library/cards/route.ts", /filter\(where playing\)/],
    ["app/api/v1/discovery/people/route.ts", /where g\.playing\b/],
    ["components/library/library-collection.tsx", /return record\.playing;/],
    [
      "components/library/library-live-stats.tsx",
      /\(record\) => record\.playing\)/,
    ],
    ["lib/api/play-next-read.ts", /\(entry\) => entry\.state\.playing\)/],
    ["components/library/game-action-panel.tsx", /state\?\.playing \?\? false/],
    ["components/library/game-quick-actions.tsx", /checked=\{state\?\.playing/],
  ];
  for (const [file, pattern] of cases) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    assert.match(source, pattern, `${file} does not read the playing flag`);
    assert.doesNotMatch(
      source,
      /status === "PLAYING"|status='PLAYING'/,
      `${file} still treats the status as the answer to "playing now"`,
    );
  }
});

test("an optimistic status does not put the flag out", async () => {
  // Predicting `playing: value === "PLAYING"` is the old coupling in the
  // browser: the row would come back saying otherwise, but the button would
  // already have gone dark.
  for (const file of [
    "lib/game-actions.ts",
    "components/library/quick-game-card.tsx",
  ]) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    assert.doesNotMatch(
      source,
      /playing: value === "PLAYING"/,
      `${file} predicts the flag from the status`,
    );
    assert.match(
      source,
      /value === "PLAYING" \? \{ playing: true \} : \{\}/,
      `${file} should only predict the flag when the status names it`,
    );
  }
});

test("the database moves the flag only when somebody names it", async () => {
  const migration = await readFile(
    path.join(
      ROOT,
      "supabase/migrations/20260926000400_playing_is_its_own_flag.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /when action_name = 'playing' then action_value/,
    "the flag action must set the flag",
  );
  assert.match(
    migration,
    /when action_name = 'status' and game_status = 'PLAYING' then not clearing/,
    "a status naming PLAYING must still move the flag, for older clients",
  );
  assert.doesNotMatch(
    migration,
    /when action_name = 'status' then game_status = 'PLAYING'/,
    "a status must no longer derive the flag",
  );
  assert.doesNotMatch(
    migration,
    /when action_name = 'playing' and action_value then 'PLAYING'/,
    "the flag must no longer move the status",
  );
});
