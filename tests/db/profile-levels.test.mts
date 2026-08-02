import assert from "node:assert/strict";
import test from "node:test";
import {
  hasDatabase,
  makeProfile,
  subjects,
  withRollback,
} from "./harness.mts";

/**
 * The level shown beside a name.
 *
 * Two things are worth holding still: the curve, which is the entire meaning
 * of the number, and the fact that it does not change with who is looking.
 * The second would be easy to break later by turning the function back into a
 * security invoker one, so it is checked against a library nobody but its
 * owner can read.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

test(
  "the curve costs 50 more XP for each level than the last",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const rows = await tx.query<{ at: string }>(
        `select public.profile_level_threshold(level) as at
         from generate_series(1, 6) as level order by level`,
      );
      assert.deepEqual(
        rows.map((row) => Number(row.at)),
        [0, 50, 150, 300, 500, 750],
      );
    });
  },
);

test("the level is the exact inverse of the threshold", { skip }, async () => {
  await withRollback(async (tx) => {
    // Both sides of every boundary: one XP short of a level must not award it,
    // and landing exactly on it must. An off-by-one here shows a full ring
    // that never ticks over, or ticks over a point early.
    //
    // From 2, because level 1 has no boundary below it to be short of: its
    // threshold is 0 and there is no such thing as -1 XP.
    const rows = await tx.query<{
      level: number;
      at_floor: number;
      below: number;
    }>(
      `select level,
              public.profile_level_for_xp(public.profile_level_threshold(level)) as at_floor,
              public.profile_level_for_xp(public.profile_level_threshold(level) - 1) as below
         from generate_series(2, 40) as level`,
    );
    assert.equal(rows.length, 39);
    for (const row of rows) {
      assert.equal(
        row.at_floor,
        row.level,
        `landing on the threshold for level ${row.level} did not award it`,
      );
      assert.equal(
        row.below,
        row.level - 1,
        `one XP short of level ${row.level} already awarded it`,
      );
    }
  });
});

test("a new account starts at level 1", { skip }, async () => {
  await withRollback(async (tx) => {
    const profileId = await makeProfile(tx, {
      username: "levelzero",
      display_name: "Level Zero",
    });
    const [standing] = await tx.query<{
      level: number;
      xp: string;
      level_floor: string;
      next_level_at: string;
    }>(`select * from public.profile_level($1)`, [profileId]);
    assert.equal(
      standing.level,
      1,
      "signing up at level 0 made the badge read as a defect on every new profile",
    );
    assert.equal(Number(standing.xp), 0);
    assert.equal(Number(standing.level_floor), 0);
    assert.equal(
      Number(standing.next_level_at),
      50,
      "an empty profile still has to show a target, or the ring means nothing",
    );
  });
});

test("activity is worth what the rates say", { skip }, async () => {
  await withRollback(async (tx) => {
    const profileId = await makeProfile(tx, {
      username: "levelearner",
      display_name: "Level Earner",
    });
    await tx.query(
      `insert into public.user_games (profile_id, igdb_id, game_slug, status)
       values ($1, 101, 'a-game', 'PLAYING')`,
      [profileId],
    );
    const [before] = await tx.query<{ xp: string }>(
      `select xp from public.profile_level($1)`,
      [profileId],
    );
    assert.equal(
      Number(before.xp),
      1,
      "a library row is worth 1, so a bulk import cannot outrank writing",
    );

    await tx.query(
      `insert into public.reviews (profile_id, igdb_id, game_slug, content)
       values ($1, 101, 'a-game', 'Worth the time.')`,
      [profileId],
    );
    const [after] = await tx.query<{ xp: string; level: number }>(
      `select xp, level from public.profile_level($1)`,
      [profileId],
    );
    assert.equal(
      Number(after.xp),
      26,
      "a review is worth 25 on top of the library row",
    );
    assert.equal(
      after.level,
      1,
      "26 XP is short of the 50 that the second level costs",
    );
  });
});

test("the level does not change with who is looking", { skip }, async () => {
  await withRollback(async (tx) => {
    const { ordinary } = await subjects(tx);
    const ownerId = await makeProfile(tx, {
      username: "levelprivate",
      display_name: "Private Library",
      library_visibility: "PRIVATE",
    });
    // Enough rows that a viewer counting only what they can see lands on a
    // visibly different number rather than coincidentally the same one.
    await tx.query(
      `insert into public.user_games (profile_id, igdb_id, game_slug, status)
       select $1, id, 'game-' || id, 'PLAYING' from generate_series(200, 259) as id`,
      [ownerId],
    );

    await tx.become("authenticated", ownerId);
    const [mine] = await tx.query<{ xp: string; level: number; games: string }>(
      `select * from public.profile_level($1)`,
      [ownerId],
    );
    await tx.query("reset role");
    assert.equal(
      Number(mine.games),
      60,
      "the owner should see their own library counted",
    );

    await tx.become("authenticated", ordinary.id);
    const [readable] = await tx.query<{ visible: number }>(
      `select count(*)::int as visible from public.user_games where profile_id = $1`,
      [ownerId],
    );
    const [theirs] = await tx.query<{ xp: string; level: number }>(
      `select * from public.profile_level($1)`,
      [ownerId],
    );
    await tx.query("reset role");

    assert.equal(readable.visible, 0, "the library is not actually private");
    assert.equal(
      Number(theirs.xp),
      Number(mine.xp),
      "a stranger saw a different number than the owner, so the level depends on the viewer",
    );
    assert.equal(theirs.level, mine.level);
  });
});

test("anonymous visitors can read a level", { skip }, async () => {
  await withRollback(async (tx) => {
    const profileId = await makeProfile(tx, {
      username: "levelanon",
      display_name: "Anon Readable",
    });
    // Profiles are public, and a badge that vanishes for logged-out readers
    // would be missing from exactly the pages that get shared.
    await tx.become("anon");
    const refused = await tx.attempt(`select * from public.profile_level($1)`, [
      profileId,
    ]);
    await tx.query("reset role");
    assert.equal(refused, null, `anon was refused with ${refused}`);
  });
});

test("a library cannot buy a level on its own", { skip }, async () => {
  await withRollback(async (tx) => {
    // The case this exists for: an account imported 1006 games in one go and
    // came out above everyone who had written anything. Importing is worth
    // something and must not be worth more than participating.
    const importerId = await makeProfile(tx, { username: "levelimporter" });
    await tx.query(
      `insert into public.user_games (profile_id, igdb_id, game_slug, status)
       select $1, id, 'game-' || id, 'PLAYING' from generate_series(1, 1000) as id`,
      [importerId],
    );
    const [importer] = await tx.query<{
      xp: string;
      games: string;
      games_scored: string;
    }>(`select * from public.profile_level($1)`, [importerId]);

    assert.equal(Number(importer.games), 1000, "the library did not land");
    assert.equal(
      Number(importer.games_scored),
      100,
      "the library is not being capped",
    );
    assert.equal(Number(importer.xp), 100);

    // Six reviews is a fraction of the effort of importing a thousand rows and
    // has to outrank it.
    const writerId = await makeProfile(tx, { username: "levelwriter" });
    await tx.query(
      `insert into public.reviews (profile_id, igdb_id, game_slug, content)
       select $1, id, 'game-' || id, 'Worth the time.' from generate_series(1, 6) as id`,
      [writerId],
    );
    const [writer] = await tx.query<{ xp: string }>(
      `select * from public.profile_level($1)`,
      [writerId],
    );
    assert.ok(
      Number(writer.xp) > Number(importer.xp),
      `six reviews scored ${writer.xp} against ${importer.xp} for a thousand imported games`,
    );
  });
});
