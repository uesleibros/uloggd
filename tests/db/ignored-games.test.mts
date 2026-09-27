import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * Games somebody decided not to play.
 *
 * The whole feature is a number that stops counting, so what matters in the
 * database is the other half: "games I refuse to play" is not a list anybody
 * else is owed, and nobody can add to it on somebody's behalf.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";

test("ignoring is the caller's own, both ways", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    await tx.query(
      `insert into public.ignored_games (profile_id, igdb_id, game_slug, note)
       values ($1, $2, $3, $4)`,
      [owner, 1029, "bs-zelda", "lost media"],
    );

    await tx.become("authenticated", stranger);
    assert.equal(
      (await tx.query("select igdb_id from public.ignored_games")).length,
      0,
      "a stranger reads none of it",
    );
    // And cannot write one either: a list of games somebody will not play is
    // a sentence about them, and only they get to say it.
    assert.equal(
      await tx.attempt(
        `insert into public.ignored_games (profile_id, igdb_id, game_slug)
         values ($1, $2, $3)`,
        [owner, 7, "forjado"],
      ),
      "42501",
    );
  });
});

test("pressing ignore twice means it once", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const put = (note: string | null) =>
      tx.query(
        `insert into public.ignored_games (profile_id, igdb_id, game_slug, note)
         values ($1, $2, $3, $4)
         on conflict (profile_id, igdb_id)
           do update set note = coalesce(excluded.note, public.ignored_games.note)`,
        [owner, 55, "satellaview", note],
      );
    await put("lost media");
    await put(null);
    const rows = await tx.query<{ note: string | null }>(
      "select note from public.ignored_games where profile_id = $1",
      [owner],
    );
    assert.equal(rows.length, 1, "one game, one opinion about it");
    // And the second press did not wipe what was written the first time.
    assert.equal(rows[0].note, "lost media");
  });
});

test("the note is a sentence, not an essay", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    assert.equal(
      await tx.attempt(
        `insert into public.ignored_games (profile_id, igdb_id, game_slug, note)
         values ($1, $2, $3, $4)`,
        [owner, 9, "jogo", "x".repeat(141)],
      ),
      "23514",
    );
  });
});
