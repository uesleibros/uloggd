import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * "Jogando" and "Jogado" are two facts, not one.
 *
 * `playing` had a column of its own but was derived from the status on every
 * write, so marking a game as played, shelved or abandoned switched off "I am
 * playing this" as a side effect. Somebody replaying a game they had finished
 * could not say both, which is the one case where saying both is the point.
 *
 * The flag now moves only when somebody says something about playing: the
 * flag itself, or a status naming PLAYING, which is what the importer and
 * every client written before this send to mean the same thing.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";
type Tx = Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>;

const GAME = 910001;
const SLUG = "playing-sync";

function act(
  tx: Tx,
  name: string,
  value: boolean | null,
  status: string | null,
) {
  return tx.query(
    `select public.set_game_card_action(
       game_id => $1, game_slug => $2, action_name => $3,
       action_value => $4::boolean, game_status => $5::public."GameStatus")`,
    [GAME, SLUG, name, value, status],
  );
}

async function card(tx: Tx, id: string) {
  const [row] = await tx.query<{ status: string; playing: boolean }>(
    `select status, playing from public.user_games
      where profile_id = $1 and igdb_id = $2`,
    [id, GAME],
  );
  return row;
}

test("a status does not switch off playing", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "playingsync" });
    await tx.become("authenticated", id);

    await act(tx, "playing", true, null);
    assert.deepEqual(await card(tx, id), { status: "BACKLOG", playing: true });

    // The reported bug, in one line: picking a status from the menu used to
    // take the flag with it.
    await act(tx, "status", null, "COMPLETED");
    assert.deepEqual(await card(tx, id), {
      status: "COMPLETED",
      playing: true,
    });

    await act(tx, "status", null, "ON_HOLD");
    assert.equal((await card(tx, id)).playing, true);
    await act(tx, "status", null, "DROPPED");
    assert.equal((await card(tx, id)).playing, true);

    // And the flag is turned off by the flag, leaving the status alone.
    await act(tx, "playing", false, null);
    assert.deepEqual(await card(tx, id), {
      status: "DROPPED",
      playing: false,
    });
  });
});

test("playing does not move the status either", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "playingalone" });
    await tx.become("authenticated", id);

    await act(tx, "status", null, "COMPLETED");
    await act(tx, "playing", true, null);
    // A replay does not unmake having finished it, and the row says both.
    assert.deepEqual(await card(tx, id), {
      status: "COMPLETED",
      playing: true,
    });
  });
});

test("a status naming PLAYING still means playing", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "playingcompat" });
    await tx.become("authenticated", id);

    // What the importer and every older client send.
    await act(tx, "status", null, "PLAYING");
    assert.deepEqual(await card(tx, id), { status: "PLAYING", playing: true });

    await act(tx, "status", false, "PLAYING");
    assert.deepEqual(await card(tx, id), { status: "BACKLOG", playing: false });
  });
});

test(
  "an older client can still stop a session it did not start",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const id = await makeProfile(tx, { username: "playingstale" });
      await tx.become("authenticated", id);

      await act(tx, "playing", true, null);
      await act(tx, "status", null, "COMPLETED");
      // A tab open since before the split says "not playing" as a status. The
      // status it names is not the one the row holds, but it is still saying
      // something about playing, so the flag listens.
      await act(tx, "status", false, "PLAYING");
      assert.deepEqual(await card(tx, id), {
        status: "COMPLETED",
        playing: false,
      });
    });
  },
);
