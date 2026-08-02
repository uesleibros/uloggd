import assert from "node:assert/strict";
import test from "node:test";
import { levelProgress, xpToNextLevel } from "../../lib/profile-level.ts";

/**
 * The arithmetic behind the ring.
 *
 * The database owns the curve, the rates and the breakdown, and is tested
 * against all three. What lives here is the translation from a standing into a
 * fraction of a circle, where the failures are a ring that overflows its own
 * track or one that never moves.
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
