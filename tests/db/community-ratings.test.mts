import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The score people see, and the score things are ranked by.
 *
 * A plain average is the right answer to "what did people give this" and the
 * wrong one to sort a catalogue by: with four votes it is mostly noise, and a
 * game one person loved would top every list beside the ones everybody has
 * played. So the average stays and a second number sits beside it, pulled
 * towards the site's own mean by how little is known about the game.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";
type Tx = Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>;

/** Ids well outside the catalogue, so the site's real rows are not in the way. */
const LOUD = 990_001;
const QUIET = 990_002;

async function rate(tx: Tx, game: number, scores: number[]) {
  for (const score of scores) {
    const voter = await makeProfile(tx, { role: "USER" });
    await tx.query(
      `insert into public.user_games (profile_id, igdb_id, game_slug, quick_rating)
       values ($1, $2, $3, $4)`,
      [voter, game, `rating-fixture-${game}`, score],
    );
  }
}

async function scores(tx: Tx) {
  const rows = await tx.query<{
    igdb_id: number;
    rating: number;
    rating_count: string;
    weighted_rating: number;
  }>(
    "select * from public.get_community_game_ratings(game_ids => $1::integer[])",
    [[LOUD, QUIET]],
  );
  return new Map(rows.map((row) => [row.igdb_id, row]));
}

test("one enthusiast does not outrank a crowd", { skip }, async () => {
  await withRollback(async (tx) => {
    await rate(tx, QUIET, [100]);
    await rate(tx, LOUD, [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]);

    const seen = await scores(tx);
    const quiet = seen.get(QUIET)!;
    const loud = seen.get(LOUD)!;

    // What people gave is untouched: the one vote really was a hundred.
    assert.equal(quiet.rating, 100);
    assert.equal(loud.rating, 90);
    assert.equal(Number(quiet.rating_count), 1);

    // But the number a ranking uses knows which of the two is known.
    assert.ok(
      loud.weighted_rating > quiet.weighted_rating,
      `twelve votes at 90 (${loud.weighted_rating}) should outrank one at 100 (${quiet.weighted_rating})`,
    );
    assert.ok(
      quiet.weighted_rating < 100,
      "a single vote should not carry its whole value",
    );
  });
});

test("enough votes and a game speaks for itself", { skip }, async () => {
  await withRollback(async (tx) => {
    await rate(
      tx,
      LOUD,
      Array.from({ length: 60 }, () => 96),
    );

    const loud = (await scores(tx)).get(LOUD)!;
    assert.equal(loud.rating, 96);
    // Sixty votes is well past the dozen the weighting asks for, so the
    // weighted number should be within a couple of points of the real one.
    assert.ok(
      Math.abs(loud.weighted_rating - 96) <= 4,
      `sixty votes should nearly reach the average, got ${loud.weighted_rating}`,
    );
  });
});

test("a banned account's rating counts for nothing", { skip }, async () => {
  await withRollback(async (tx) => {
    const banned = await makeProfile(tx, { role: "USER" });
    await tx.query(
      `insert into public.user_games (profile_id, igdb_id, game_slug, quick_rating)
       values ($1, $2, 'rating-fixture-990001', 10)`,
      [banned, LOUD],
    );
    await rate(tx, LOUD, [90, 90]);
    // Banned the way the site bans, so the row is the shape the site writes.
    const admin = await makeProfile(tx, { role: "ADMIN" });
    await tx.become("authenticated", admin);
    await tx.query("select public.moderate_profile($1, 'BAN', $2, null)", [
      banned,
      "rating fixture",
    ]);
    await tx.query("reset role");

    const loud = (await scores(tx)).get(LOUD)!;
    assert.equal(Number(loud.rating_count), 2);
    assert.equal(loud.rating, 90);
  });
});
