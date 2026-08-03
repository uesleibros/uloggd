import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The Twitch link, the live switch, and the boundary that keeps a handle
 * honest.
 *
 * The thing worth holding still here is who is allowed to say whose channel
 * this is. A handle on a profile is a claim about a person, and the site shows
 * that person's stream under it; if a browser could write one, anyone could
 * put a streamer's channel on their own page. So the write is reachable only
 * by the server, after Twitch has confirmed the account, and these tests fail
 * if that ever stops being true.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

test("no browser role can write a Twitch handle", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "twitchnowrite" });
    await tx.become("authenticated", id);

    // The verified write is service-role only. `42501` is the refusal; the
    // dangerous outcome is it succeeding.
    assert.equal(
      await tx.attempt(`select public.connect_twitch($1, 'someone', '1')`, [
        id,
      ]),
      "42501",
      "an ordinary account can write a Twitch handle",
    );
    // The old typed-handle function is gone rather than merely unused: left in
    // place it would still be an unverified way in.
    assert.equal(
      await tx.attempt(`select public.set_twitch_connection('someone')`),
      "42883",
      "the typed-handle function is still callable",
    );
    // And the column itself, in case a grant ever opens a direct update.
    const direct = await tx.attempt(
      `update public.profiles set twitch_username = 'someone' where id = $1`,
      [id],
    );
    await tx.query("reset role");
    assert.equal(
      direct,
      "42501",
      "the column is directly writable by the account",
    );
    const [row] = await tx.query<{ twitch_username: string | null }>(
      `select twitch_username from public.profiles where id = $1`,
      [id],
    );
    assert.equal(row.twitch_username, null);
  });
});

test("the verified write cleans and validates", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "twitchverified" });

    await tx.query(`select public.connect_twitch($1, ' @Ninja ', '111')`, [id]);
    const [row] = await tx.query<{
      twitch_username: string;
      twitch_user_id: string;
    }>(
      `select twitch_username, twitch_user_id from public.profiles where id = $1`,
      [id],
    );
    assert.equal(row.twitch_username, "Ninja", "the @ and spaces survived");
    assert.equal(row.twitch_user_id, "111");

    for (const bad of [
      "ab",
      "not a handle",
      "chan/../evil",
      "a".repeat(26),
      "",
    ])
      assert.equal(
        await tx.attempt(`select public.connect_twitch($1, $2, '111')`, [
          id,
          bad,
        ]),
        "22023",
        `"${bad}" was accepted as a channel name`,
      );

    // A handle with no channel id would be a link nothing can verify later,
    // which is the state this whole design exists to avoid.
    assert.equal(
      await tx.attempt(`select public.connect_twitch($1, 'goodname', '')`, [
        id,
      ]),
      "22023",
      "a handle without a channel id was accepted",
    );
  });
});

test("one channel belongs to one account", { skip }, async () => {
  await withRollback(async (tx) => {
    const firstId = await makeProfile(tx, { username: "twitchfirst" });
    const secondId = await makeProfile(tx, { username: "twitchsecond" });

    await tx.query(`select public.connect_twitch($1, 'sharedchan', '4242')`, [
      firstId,
    ]);
    assert.equal(
      await tx.attempt(
        `select public.connect_twitch($1, 'sharedchan', '4242')`,
        [secondId],
      ),
      "23505",
      "the same channel landed on two profiles",
    );

    // Reconnecting the same channel to the same profile still has to work:
    // people re-authorize after changing their Twitch name.
    await tx.query(`select public.connect_twitch($1, 'renamedchan', '4242')`, [
      firstId,
    ]);
    const [row] = await tx.query<{ twitch_username: string }>(
      `select twitch_username from public.profiles where id = $1`,
      [firstId],
    );
    assert.equal(row.twitch_username, "renamedchan");
  });
});

test("unlinking is the account's own to do", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await makeProfile(tx, { username: "twitchunlinkmine" });
    const theirsId = await makeProfile(tx, { username: "twitchunlinktheirs" });
    await tx.query(`select public.connect_twitch($1, 'minechan', '10')`, [
      mineId,
    ]);
    await tx.query(`select public.connect_twitch($1, 'theirchan', '20')`, [
      theirsId,
    ]);

    await tx.become("authenticated", mineId);
    await tx.query(`select public.disconnect_twitch()`);
    await tx.query("reset role");

    const [mine] = await tx.query<{
      twitch_username: string | null;
      twitch_user_id: string | null;
    }>(
      `select twitch_username, twitch_user_id from public.profiles where id = $1`,
      [mineId],
    );
    const [theirs] = await tx.query<{ twitch_username: string | null }>(
      `select twitch_username from public.profiles where id = $1`,
      [theirsId],
    );
    assert.equal(mine.twitch_username, null, "my own link survived");
    assert.equal(
      mine.twitch_user_id,
      null,
      "unlinking left the channel id behind",
    );
    assert.equal(
      theirs.twitch_username,
      "theirchan",
      "someone else was unlinked",
    );
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
      await tx.attempt(`select public.set_twitch_live_visible(false)`),
      "42501",
    );
    assert.equal(
      await tx.attempt(`select public.disconnect_twitch()`),
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
    const [second] = await tx.query<{ adopted: boolean }>(
      `select public.adopt_twitch_identity() as adopted`,
    );
    await tx.query("reset role");
    assert.equal(second.adopted, false, "a later sign-in adopted again");

    const [row] = await tx.query<{
      twitch_username: string;
      twitch_user_id: string;
    }>(
      `select twitch_username, twitch_user_id from public.profiles where id = $1`,
      [id],
    );
    assert.equal(row.twitch_username, "adoptedchan");
    assert.equal(row.twitch_user_id, "7777", "the channel id was not adopted");
  });
});

test(
  "a sign-in never fails over a channel already taken",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const ownerId = await makeProfile(tx, { username: "twitchowner" });
      const laterId = await makeProfile(tx, { username: "twitchlater" });
      await tx.query(`select public.connect_twitch($1, 'takenchan', '5150')`, [
        ownerId,
      ]);
      await tx.query(
        `insert into auth.identities (provider_id, user_id, identity_data, provider)
       values ($1::text, $2::uuid, '{"nickname": "takenchan"}'::jsonb, 'twitch')`,
        ["5150", laterId],
      );

      await tx.become("authenticated", laterId);
      // The conflict has to come back as "adopted nothing", not as an exception:
      // this runs inside the auth callback, and throwing would turn a working
      // sign-in into an error page over a cosmetic detail.
      const [result] = await tx.query<{ adopted: boolean }>(
        `select public.adopt_twitch_identity() as adopted`,
      );
      await tx.query("reset role");
      assert.equal(result.adopted, false);
    });
  },
);

test(
  "the handle and the switch are readable by visitors",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const id = await makeProfile(tx, { username: "twitchpublic" });
      await tx.query(`select public.connect_twitch($1, 'publicchan', '9')`, [
        id,
      ]);

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
  },
);
