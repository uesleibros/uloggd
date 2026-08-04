import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

const skip = hasDatabase ? false : "DIRECT_URL is not set";

test(
  "changing Playing keeps the status and compatibility boolean together",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const profileId = await makeProfile(tx, { username: "playingsync" });
      await tx.become("authenticated", profileId);

      await tx.query(
        `select public.set_game_card_action($1, $2, 'status', null, 'PLAYING')`,
        [910001, "playing-sync"],
      );
      let [game] = await tx.query<{ status: string; playing: boolean }>(
        `select status, playing from public.user_games
       where profile_id = $1 and igdb_id = $2`,
        [profileId, 910001],
      );
      assert.deepEqual(game, { status: "PLAYING", playing: true });

      await tx.query(
        `select public.set_game_card_action($1, $2, 'status', null, 'BACKLOG')`,
        [910001, "playing-sync"],
      );
      [game] = await tx.query<{ status: string; playing: boolean }>(
        `select status, playing from public.user_games
       where profile_id = $1 and igdb_id = $2`,
        [profileId, 910001],
      );
      assert.deepEqual(game, { status: "BACKLOG", playing: false });

      // An older open tab can still send the former boolean action. It must not
      // recreate the same disagreement while that deployment drains away.
      await tx.query(
        `select public.set_game_card_action($1, $2, 'playing', true, null)`,
        [910001, "playing-sync"],
      );
      [game] = await tx.query<{ status: string; playing: boolean }>(
        `select status, playing from public.user_games
       where profile_id = $1 and igdb_id = $2`,
        [profileId, 910001],
      );
      assert.deepEqual(game, { status: "PLAYING", playing: true });

      await tx.query(
        `select public.set_game_card_action($1, $2, 'playing', false, null)`,
        [910001, "playing-sync"],
      );
      [game] = await tx.query<{ status: string; playing: boolean }>(
        `select status, playing from public.user_games
       where profile_id = $1 and igdb_id = $2`,
        [profileId, 910001],
      );
      assert.deepEqual(game, { status: "BACKLOG", playing: false });
    });
  },
);
