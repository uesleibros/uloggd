import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The Twitch link and the live card's switch.
 *
 * Two things are worth holding still here. A handle is written into a link
 * that visitors click, so anything that is not a channel name has to be
 * refused rather than stored. And the channel id has to follow the handle:
 * an id left behind after a rename points the card at whoever took the old
 * name, which is the one failure that shows a stranger's stream on your page.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

test("a handle is cleaned, and a bad one is refused", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "twitchclean" });
    await tx.become("authenticated", id);

    await tx.query(`select public.set_twitch_connection($1)`, ["  @Ninja  "]);
    const [cleaned] = await tx.query<{ twitch_username: string }>(
      `select twitch_username from public.profiles where id = $1`,
      [id],
    );
    assert.equal(cleaned.twitch_username, "Ninja", "the @ and spaces survived");

    for (const bad of ["ab", "not a handle", "channel/../evil", "a".repeat(26)])
      assert.equal(
        await tx.attempt(`select public.set_twitch_connection($1)`, [bad]),
        "22023",
        `"${bad}" was accepted as a channel name`,
      );
    await tx.query("reset role");
  });
});

test("the channel id follows the handle", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "twitchid" });
    await tx.become("authenticated", id);

    await tx.query(`select public.set_twitch_connection($1, $2)`, [
      "firstchan",
      "12345",
    ]);
    // Case is the only difference, so this is the same channel and the id it
    // was linked with still applies.
    await tx.query(`select public.set_twitch_connection($1)`, ["FirstChan"]);
    const [same] = await tx.query<{ twitch_user_id: string | null }>(
      `select twitch_user_id from public.profiles where id = $1`,
      [id],
    );
    assert.equal(same.twitch_user_id, "12345", "the id was dropped on a rename");

    await tx.query(`select public.set_twitch_connection($1)`, ["otherchan"]);
    const [moved] = await tx.query<{ twitch_user_id: string | null }>(
      `select twitch_user_id from public.profiles where id = $1`,
      [id],
    );
    assert.equal(
      moved.twitch_user_id,
      null,
      "a different channel kept the previous channel's id",
    );

    await tx.query(`select public.set_twitch_connection($1, $2)`, [
      "otherchan",
      "999",
    ]);
    await tx.query(`select public.set_twitch_connection($1)`, [""]);
    const [cleared] = await tx.query<{
      twitch_username: string | null;
      twitch_user_id: string | null;
    }>(`select twitch_username, twitch_user_id from public.profiles where id = $1`, [
      id,
    ]);
    assert.equal(cleared.twitch_username, null);
    assert.equal(cleared.twitch_user_id, null, "unlinking left the id behind");
    await tx.query("reset role");
  });
});

test("the live switch is the caller's own", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await makeProfile(tx, { username: "twitchlivemine" });
    const theirsId = await makeProfile(tx, { username: "twitchlivetheirs" });
    await tx.become("authenticated", mineId);
    await tx.query(`select public.set_twitch_live_visible(false)`);
    await tx.query("reset role");

    const [mine] = await tx.query<{ v: boolean }>(
      `select twitch_live_visible as v from public.profiles where id = $1`,
      [mineId],
    );
    const [theirs] = await tx.query<{ v: boolean }>(
      `select twitch_live_visible as v from public.profiles where id = $1`,
      [theirsId],
    );
    assert.equal(mine.v, false, "my own switch did not move");
    assert.equal(theirs.v, true, "someone else's switch moved");
  });
});

test("nothing works signed out", { skip }, async () => {
  await withRollback(async (tx) => {
    await tx.become("anon");
    assert.equal(
      await tx.attempt(`select public.set_twitch_connection('somechan')`),
      "42501",
    );
    assert.equal(
      await tx.attempt(`select public.set_twitch_live_visible(false)`),
      "42501",
    );
    assert.equal(
      await tx.attempt(`select public.adopt_twitch_identity()`),
      "42501",
    );
    await tx.query("reset role");
  });
});

test("signing in with Twitch fills the handle in, once", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "twitchadopt" });
    await tx.query(
      `insert into auth.identities (provider_id, user_id, identity_data, provider)
       values ($1::text, $2::uuid, '{"nickname": "adoptedchan"}'::jsonb, 'twitch')`,
      ["7777", id],
    );

    await tx.become("authenticated", id);
    const [first] = await tx.query<{ adopted: boolean }>(
      `select public.adopt_twitch_identity() as adopted`,
    );
    assert.equal(first.adopted, true);

    // An edit the person made on purpose must survive the next sign-in.
    await tx.query(`select public.set_twitch_connection($1)`, ["mineinstead"]);
    const [second] = await tx.query<{ adopted: boolean }>(
      `select public.adopt_twitch_identity() as adopted`,
    );
    await tx.query("reset role");
    assert.equal(second.adopted, false, "a later sign-in overwrote the edit");

    const [row] = await tx.query<{
      twitch_username: string;
      twitch_user_id: string | null;
    }>(`select twitch_username, twitch_user_id from public.profiles where id = $1`, [
      id,
    ]);
    assert.equal(row.twitch_username, "mineinstead");
  });
});

test("the handle and the switch are readable by visitors", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "twitchpublic" });
    await tx.become("authenticated", id);
    await tx.query(`select public.set_twitch_connection($1)`, ["publicchan"]);
    await tx.query("reset role");

    // The live card renders for signed-out visitors, so the profile page has
    // to be able to read both columns as `anon`.
    await tx.become("anon");
    const rows = await tx.query<{
      twitch_username: string;
      twitch_live_visible: boolean;
    }>(
      `select twitch_username, twitch_live_visible from public.profiles where id = $1`,
      [id],
    );
    await tx.query("reset role");
    assert.equal(rows[0]?.twitch_username, "publicchan");
    assert.equal(rows[0]?.twitch_live_visible, true);
  });
});
