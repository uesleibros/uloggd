import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * Blocking, checked across every table a profile owns.
 *
 * A block that holds in six places and leaks in the seventh is not a block
 * anyone can rely on, and being able to rely on it is the entire feature.
 * `journeys` was that seventh: its policy was `using (true)`, so blocking hid
 * a person's reviews, screenshots, diary, comments, library and lists, and
 * left their journeys readable.
 *
 * The list below is deliberately every owned surface rather than the ones
 * known to work, so a table added later shows up here as a failure instead of
 * being quietly exempt.
 */
const OWNED_SURFACES: [table: string, column: string][] = [
  ["reviews", "profile_id"],
  ["screenshots", "profile_id"],
  ["diary_entries", "profile_id"],
  ["profile_comments", "profile_id"],
  ["user_games", "profile_id"],
  ["game_lists", "profile_id"],
  ["journeys", "profile_id"],
];

test(
  "a blocked account cannot read anything the blocker owns",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      // Seeded rather than found. This test once located a live account that
      // owned a journey and a review, and broke the day that account cleared
      // its data: a test that depends on what users happen to keep is a test
      // that expires. The blocker now owns one row on every surface below.
      const blocker = { id: await makeProfile(tx, { username: "blockowner" }) };
      const blocked = { id: await makeProfile(tx, { username: "blockedone" }) };
      await tx.query(
        `insert into public.reviews (profile_id, igdb_id, game_slug, content)
         values ($1, 700, 'b-game', 'Mine.')`,
        [blocker.id],
      );
      await tx.query(
        `insert into public.screenshots (profile_id, igdb_id, game_slug, width, height, image_url)
         values ($1, 700, 'b-game', 1920, 1080, 'https://cdn.imgchest.com/files/block-test.webp')`,
        [blocker.id],
      );
      await tx.query(
        `insert into public.diary_entries (profile_id, igdb_id, game_slug, played_on)
         values ($1, 700, 'b-game', current_date)`,
        [blocker.id],
      );
      await tx.query(
        `insert into public.profile_comments (profile_id, author_id, body)
         values ($1, $1, 'On my own wall.')`,
        [blocker.id],
      );
      await tx.query(
        `insert into public.user_games (profile_id, igdb_id, game_slug, status)
         values ($1, 700, 'b-game', 'PLAYING')`,
        [blocker.id],
      );
      await tx.query(
        `insert into public.game_lists (profile_id, name, visibility)
         values ($1, 'Block test', 'PUBLIC')`,
        [blocker.id],
      );
      await tx.query(
        `insert into public.journeys (profile_id, igdb_id, game_slug, title)
         values ($1, 700, 'b-game', 'Block run')`,
        [blocker.id],
      );

      // Establish what is visible before the block, so a surface that is empty
      // for unrelated reasons is not mistaken for a working block.
      await tx.become("authenticated", blocked.id);
      const before = new Map<string, number>();
      for (const [table, column] of OWNED_SURFACES)
        before.set(
          table,
          (
            await tx.query(
              `select 1 from public.${table} where ${column} = $1`,
              [blocker.id],
            )
          ).length,
        );
      await tx.query("reset role");

      await tx.query(
        `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)
         on conflict do nothing`,
        [blocker.id, blocked.id],
      );

      await tx.become("authenticated", blocked.id);
      const leaking: string[] = [];
      let meaningful = 0;
      for (const [table, column] of OWNED_SURFACES) {
        if ((before.get(table) ?? 0) === 0) continue;
        meaningful += 1;
        const rows = await tx.query(
          `select 1 from public.${table} where ${column} = $1`,
          [blocker.id],
        );
        if (rows.length > 0) leaking.push(table);
      }
      await tx.query("reset role");

      assert.equal(
        meaningful,
        OWNED_SURFACES.length,
        "a surface was invisible even before the block, so it was never tested",
      );
      assert.deepEqual(
        leaking,
        [],
        `a blocked account can still read these: ${leaking.join(", ")}`,
      );
    });
  },
);

test(
  "a blocked account cannot follow or comment on the blocker",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const pair = await tx.query<{ id: string }>(
        `select id from public.profiles order by created_at limit 2`,
      );
      assert.equal(pair.length, 2, "need two accounts");
      const [blocker, blocked] = pair;

      await tx.query(
        `delete from public.follows where follower_id = $1 and following_id = $2`,
        [blocked.id, blocker.id],
      );
      await tx.query(
        `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)
         on conflict do nothing`,
        [blocker.id, blocked.id],
      );

      await tx.become("authenticated", blocked.id);
      assert.ok(
        await tx.attempt(
          `insert into public.follows (follower_id, following_id) values ($1, $2)`,
          [blocked.id, blocker.id],
        ),
        "a blocked account can follow the person who blocked them",
      );
      assert.ok(
        await tx.attempt(
          `insert into public.profile_comments (profile_id, author_id, body)
           values ($1, $2, 'test')`,
          [blocker.id, blocked.id],
        ),
        "a blocked account can comment on the profile that blocked them",
      );
    });
  },
);
