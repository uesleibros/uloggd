import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * A status turned off gives the game back what it was.
 *
 * The card's two status toggles used to name a replacement when they were
 * switched off, and the only replacement an interface could name was BACKLOG.
 * So a finished game marked as being played again came back as backlog, and a
 * wishlisted game that somebody ticked and unticked was in the backlog from
 * then on. The row remembers now, and finishing a game leaves a date that
 * playing it again does not unmake.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";

async function card(
  tx: Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>,
  id: string,
) {
  const [row] = await tx.query<{
    status: string;
    previous_status: string | null;
    playing: boolean;
    completed_at: string | null;
  }>(
    `select status, previous_status, playing, completed_at
       from public.user_games where profile_id = $1 and igdb_id = 1074`,
    [id],
  );
  return row;
}

test("playing a finished game again, and stopping", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const act = (name: string, value: string | null, status: string | null) =>
      tx.query(
        `select public.set_game_card_action(
           game_id => 1074, game_slug => 'super-mario-bros',
           action_name => $1, action_value => $2::boolean,
           game_status => $3::public."GameStatus")`,
        [name, value, status],
      );

    await act("status", null, "COMPLETED");
    const finished = await card(tx, id);
    assert.equal(finished.status, "COMPLETED");
    assert.ok(finished.completed_at, "finishing a game left no date");

    // Playing it again keeps the fact that it was finished, in the date and
    // in what the row will go back to.
    await act("status", null, "PLAYING");
    const replaying = await card(tx, id);
    assert.equal(replaying.status, "PLAYING");
    assert.equal(replaying.playing, true);
    assert.equal(replaying.previous_status, "COMPLETED");
    assert.ok(replaying.completed_at, "the completion date was thrown away");

    // And turning it off goes back to finished rather than to the backlog.
    await act("status", "false", "PLAYING");
    const after = await card(tx, id);
    assert.equal(after.status, "COMPLETED");
    assert.equal(after.playing, false);
    assert.equal(after.previous_status, null);
  });
});

test("a wishlisted game ticked and unticked", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const act = (value: string | null, status: string) =>
      tx.query(
        `select public.set_game_card_action(
           game_id => 1074, game_slug => 'super-mario-bros',
           action_name => 'status', action_value => $1::boolean,
           game_status => $2::public."GameStatus")`,
        [value, status],
      );

    await act(null, "WISHLIST");
    await act(null, "COMPLETED");
    await act("false", "COMPLETED");
    const after = await card(tx, id);
    assert.equal(after.status, "WISHLIST");
    // Finished once, so the date stays even though the status moved on.
    assert.ok(after.completed_at);
  });
});

test("turning off a status the game does not have", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    await tx.query(
      `select public.set_game_card_action(
         game_id => 1074, game_slug => 'super-mario-bros',
         action_name => 'status', action_value => null,
         game_status => 'PLAYING'::public."GameStatus")`,
    );
    // Somebody else's click arriving late, or a stale card: it leaves the row
    // alone rather than moving it somewhere nobody asked for.
    await tx.query(
      `select public.set_game_card_action(
         game_id => 1074, game_slug => 'super-mario-bros',
         action_name => 'status', action_value => false,
         game_status => 'COMPLETED'::public."GameStatus")`,
    );
    assert.equal((await card(tx, id)).status, "PLAYING");
  });
});
