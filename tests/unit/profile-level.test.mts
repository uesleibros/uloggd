import assert from "node:assert/strict";
import test from "node:test";
import {
  XP_RATES,
  levelProgress,
  xpToNextLevel,
} from "../../lib/profile-level.ts";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The arithmetic behind the ring.
 *
 * The database owns the curve and is tested against it; what lives here is the
 * translation from a standing into a fraction of a circle, where the failures
 * are a ring that overflows its own track or one that never moves.
 */

test("progress runs from empty to full across a level", () => {
  const level = { level_floor: 50, next_level_at: 150 };
  assert.equal(levelProgress({ ...level, xp: 50 }), 0);
  assert.equal(levelProgress({ ...level, xp: 100 }), 0.5);
  assert.equal(levelProgress({ ...level, xp: 150 }), 1);
});

test("progress is clamped to the ring", () => {
  // The standing is read at one instant and the level is derived from the same
  // row, so these should not happen; a ring drawn past its own circumference
  // wraps and reads as almost empty, which is the worst possible failure for
  // someone who just levelled up.
  const level = { level_floor: 50, next_level_at: 150 };
  assert.equal(levelProgress({ ...level, xp: 400 }), 1);
  assert.equal(levelProgress({ ...level, xp: 10 }), 0);
});

test("a level with no width does not divide by zero", () => {
  const flat = { xp: 0, level_floor: 0, next_level_at: 0 };
  assert.equal(levelProgress(flat), 0);
  assert.ok(Number.isFinite(levelProgress(flat)));
});

test("the remaining XP never goes negative", () => {
  assert.equal(xpToNextLevel({ xp: 118, next_level_at: 150 }), 32);
  assert.equal(xpToNextLevel({ xp: 150, next_level_at: 150 }), 0);
  assert.equal(xpToNextLevel({ xp: 200, next_level_at: 150 }), 0);
});

test("the rates shown to readers match the ones the database scores by", async () => {
  // Two copies of these numbers exist because the dialog explains the scoring
  // and cannot ask the database for six labels. They are only useful while
  // they agree: a dialog that says a review is worth 25 while the function
  // awards 10 is worse than no dialog.
  const migration = await readFile(
    path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260802000100_profile_levels.sql",
    ),
    "utf8",
  );
  const rates = new Map(
    [...migration.matchAll(/\('([A-Z]+)', (\d+)\)/g)].map((match) => [
      match[1],
      Number(match[2]),
    ]),
  );
  assert.equal(rates.size, 6, "the rate table moved or changed shape");

  const pairs: [keyof typeof XP_RATES, string][] = [
    ["sessions", "SESSION"],
    ["reviews", "REVIEW"],
    ["journeys", "JOURNEY"],
    ["lists", "LIST"],
    ["screenshots", "SCREENSHOT"],
    ["games", "GAME"],
  ];
  for (const [key, activity] of pairs)
    assert.equal(
      XP_RATES[key],
      rates.get(activity),
      `the interface scores ${key} differently from the database`,
    );

  // The sum in `profile_level` is a third copy, and the one that actually
  // decides the number. Checked here so a rate changed in the table but not in
  // the sum cannot ship.
  for (const [key, activity] of pairs) {
    const column = key === "sessions" ? "sessions" : key;
    const found = new RegExp(`counts\\.${column} \\* (\\d+)`).exec(migration);
    assert.ok(found, `no term for ${activity} in the XP sum`);
    assert.equal(
      Number(found[1]),
      XP_RATES[key],
      `${activity} is scored differently in the sum than in the rate table`,
    );
  }
});
