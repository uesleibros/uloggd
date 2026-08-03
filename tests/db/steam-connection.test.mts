import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The Steam link and the "playing now" switch.
 *
 * Same boundary as Twitch, and the same reason for it: a Steam id on a profile
 * makes the site say "this person is playing X right now", and nobody should
 * be able to say that about somebody else. The write is server-only, after
 * Steam's OpenID has confirmed the account.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

const STEAM_ID = "76561197960287930";

test("no browser role can write a Steam id", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "steamnowrite" });
    await tx.become("authenticated", id);

    assert.equal(
      await tx.attempt(`select public.connect_steam($1, $2, 'someone')`, [
        id,
        STEAM_ID,
      ]),
      "42501",
      "an ordinary account can write a Steam id",
    );
    const direct = await tx.attempt(
      `update public.profiles set steam_id = $2 where id = $1`,
      [id, STEAM_ID],
    );
    await tx.query("reset role");
    assert.equal(direct, "42501", "the column is directly writable");
  });
});

test("only a real SteamID64 is accepted", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "steamvalid" });

    await tx.query(`select public.connect_steam($1, $2, '  Gabe  ')`, [
      id,
      ` ${STEAM_ID} `,
    ]);
    const [row] = await tx.query<{
      steam_id: string;
      steam_username: string;
    }>(`select steam_id, steam_username from public.profiles where id = $1`, [
      id,
    ]);
    assert.equal(row.steam_id, STEAM_ID, "the id was not trimmed");
    assert.equal(row.steam_username, "Gabe");

    for (const bad of ["", "12345", "not-an-id", `${STEAM_ID}9`, "7656119796x"])
      assert.equal(
        await tx.attempt(`select public.connect_steam($1, $2, null)`, [id, bad]),
        "22023",
        `"${bad}" was accepted as a SteamID64`,
      );
  });
});

test("the display name is optional", { skip }, async () => {
  await withRollback(async (tx) => {
    // Without a Steam API key there is no nickname to store, and refusing the
    // connection over a missing one would make the whole feature depend on a
    // key it does not need to work.
    const id = await makeProfile(tx, { username: "steamnokey" });
    await tx.query(`select public.connect_steam($1, $2, null)`, [id, STEAM_ID]);
    const [row] = await tx.query<{
      steam_id: string;
      steam_username: string | null;
    }>(`select steam_id, steam_username from public.profiles where id = $1`, [
      id,
    ]);
    assert.equal(row.steam_id, STEAM_ID);
    assert.equal(row.steam_username, null);
  });
});

test("one Steam account belongs to one profile", { skip }, async () => {
  await withRollback(async (tx) => {
    const firstId = await makeProfile(tx, { username: "steamfirst" });
    const secondId = await makeProfile(tx, { username: "steamsecond" });

    await tx.query(`select public.connect_steam($1, $2, 'first')`, [
      firstId,
      STEAM_ID,
    ]);
    assert.equal(
      await tx.attempt(`select public.connect_steam($1, $2, 'second')`, [
        secondId,
        STEAM_ID,
      ]),
      "23505",
      "the same Steam account landed on two profiles",
    );

    // Reconnecting the same account to the same profile still works, which is
    // what a nickname change looks like from here.
    await tx.query(`select public.connect_steam($1, $2, 'renamed')`, [
      firstId,
      STEAM_ID,
    ]);
    const [row] = await tx.query<{ steam_username: string }>(
      `select steam_username from public.profiles where id = $1`,
      [firstId],
    );
    assert.equal(row.steam_username, "renamed");
  });
});

test("unlinking is the account's own to do", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await makeProfile(tx, { username: "steamunlinkmine" });
    const theirsId = await makeProfile(tx, { username: "steamunlinktheirs" });
    await tx.query(`select public.connect_steam($1, $2, 'mine')`, [
      mineId,
      STEAM_ID,
    ]);
    await tx.query(`select public.connect_steam($1, '76561197960287931', 'x')`, [
      theirsId,
    ]);

    await tx.become("authenticated", mineId);
    await tx.query(`select public.disconnect_steam()`);
    await tx.query("reset role");

    const [mine] = await tx.query<{
      steam_id: string | null;
      steam_username: string | null;
    }>(`select steam_id, steam_username from public.profiles where id = $1`, [
      mineId,
    ]);
    const [theirs] = await tx.query<{ steam_id: string | null }>(
      `select steam_id from public.profiles where id = $1`,
      [theirsId],
    );
    assert.equal(mine.steam_id, null, "my own link survived");
    assert.equal(mine.steam_username, null, "the name was left behind");
    assert.equal(theirs.steam_id, "76561197960287931", "someone else was unlinked");
  });
});

test("the playing switch is the caller's own", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await makeProfile(tx, { username: "steamplayingmine" });
    const theirsId = await makeProfile(tx, { username: "steamplayingtheirs" });
    await tx.become("authenticated", mineId);
    await tx.query(`select public.set_steam_playing_visible(false)`);
    await tx.query("reset role");

    const [mine] = await tx.query<{ v: boolean }>(
      `select steam_playing_visible as v from public.profiles where id = $1`,
      [mineId],
    );
    const [theirs] = await tx.query<{ v: boolean }>(
      `select steam_playing_visible as v from public.profiles where id = $1`,
      [theirsId],
    );
    assert.equal(mine.v, false, "my own switch did not move");
    assert.equal(theirs.v, true, "someone else's switch moved");
  });
});

test("nothing works signed out", { skip }, async () => {
  await withRollback(async (tx) => {
    await tx.become("anon");
    assert.equal(await tx.attempt(`select public.disconnect_steam()`), "42501");
    assert.equal(
      await tx.attempt(`select public.set_steam_playing_visible(false)`),
      "42501",
    );
    await tx.query("reset role");
  });
});

test("the link and the switch are readable by visitors", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "steampublic" });
    await tx.query(`select public.connect_steam($1, $2, 'public')`, [
      id,
      STEAM_ID,
    ]);

    // The profile page renders for signed-out visitors, so all three columns
    // have to be readable as `anon`.
    await tx.become("anon");
    const rows = await tx.query<{
      steam_id: string;
      steam_username: string;
      steam_playing_visible: boolean;
    }>(
      `select steam_id, steam_username, steam_playing_visible
         from public.profiles where id = $1`,
      [id],
    );
    await tx.query("reset role");
    assert.equal(rows[0]?.steam_id, STEAM_ID);
    assert.equal(rows[0]?.steam_username, "public");
    assert.equal(rows[0]?.steam_playing_visible, true);
  });
});
