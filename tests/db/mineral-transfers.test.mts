import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * Sending minerals.
 *
 * A wallet stopped being a counter here and became an account: it can go down.
 * Everything below is about the ways an account that can go down goes wrong,
 * because every one of them mints currency out of nothing and cannot be undone
 * once people have spent it.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

async function withMinerals(
  tx: Parameters<Parameters<typeof withRollback>[0]>[0],
  name: string,
  mineral: string,
  count: number,
) {
  const id = await makeProfile(tx, { username: name });
  await tx.query(
    `insert into public.mineral_grants (profile_id, level, mineral)
     select $1, i + 1, $2::public."MineralKind" from generate_series(1, $3) as i`,
    [id, mineral, count],
  );
  return id;
}

async function balanceOf(
  tx: Parameters<Parameters<typeof withRollback>[0]>[0],
  id: string,
  mineral: string,
) {
  const [row] = await tx.query<{ amount: string }>(
    `select amount::text from public.profile_minerals($1) where mineral = $2`,
    [id, mineral],
  );
  return Number(row.amount);
}

test("a transfer moves the balance both ways", { skip }, async () => {
  await withRollback(async (tx) => {
    const senderId = await withMinerals(tx, "sendfrom", "COPPER", 5);
    const recipientId = await makeProfile(tx, { username: "sendto" });

    await tx.become("authenticated", senderId);
    await tx.query(`select public.send_minerals($1, $2::jsonb, $3)`, [
      recipientId,
      JSON.stringify({ COPPER: 2 }),
      "for the shop",
    ]);
    await tx.query("reset role");

    assert.equal(await balanceOf(tx, senderId, "COPPER"), 3);
    assert.equal(await balanceOf(tx, recipientId, "COPPER"), 2);
  });
});

test("nobody can send what they do not have", { skip }, async () => {
  await withRollback(async (tx) => {
    const senderId = await withMinerals(tx, "sendbroke", "COPPER", 1);
    const recipientId = await makeProfile(tx, { username: "sendbroketo" });

    await tx.become("authenticated", senderId);
    const refused = await tx.attempt(
      `select public.send_minerals($1, $2::jsonb)`,
      [recipientId, JSON.stringify({ COPPER: 2 })],
    );
    await tx.query("reset role");

    assert.equal(refused, "22023");
    // The whole call has to roll back, not just the item: a transfer row with
    // no items is a receipt for nothing.
    assert.equal(await balanceOf(tx, senderId, "COPPER"), 1);
    assert.equal(await balanceOf(tx, recipientId, "COPPER"), 0);
  });
});

test("a mixed send is all or nothing", { skip }, async () => {
  await withRollback(async (tx) => {
    // The case that would be easy to get wrong: the first mineral is
    // affordable and the second is not. Sending the affordable half and
    // reporting success is worse than refusing, because the sender believes
    // something else happened.
    const senderId = await withMinerals(tx, "sendmixed", "COPPER", 3);
    const recipientId = await makeProfile(tx, { username: "sendmixedto" });

    await tx.become("authenticated", senderId);
    const refused = await tx.attempt(
      `select public.send_minerals($1, $2::jsonb)`,
      [recipientId, JSON.stringify({ COPPER: 1, RUBY: 1 })],
    );
    await tx.query("reset role");

    assert.equal(refused, "22023");
    assert.equal(
      await balanceOf(tx, senderId, "COPPER"),
      3,
      "the affordable half of a refused transfer was sent anyway",
    );
    assert.equal(await balanceOf(tx, recipientId, "COPPER"), 0);
  });
});

test("zero and negative amounts are refused", { skip }, async () => {
  await withRollback(async (tx) => {
    // A negative amount would be a withdrawal from the recipient, which is the
    // most valuable bug in the whole feature.
    const senderId = await withMinerals(tx, "sendzero", "COPPER", 5);
    const recipientId = await withMinerals(tx, "sendzeroto", "COPPER", 5);

    await tx.become("authenticated", senderId);
    const zero = await tx.attempt(
      `select public.send_minerals($1, $2::jsonb)`,
      [recipientId, JSON.stringify({ COPPER: 0 })],
    );
    const negative = await tx.attempt(
      `select public.send_minerals($1, $2::jsonb)`,
      [recipientId, JSON.stringify({ COPPER: -3 })],
    );
    await tx.query("reset role");

    assert.equal(zero, "22023");
    assert.equal(negative, "22023");
    assert.equal(await balanceOf(tx, recipientId, "COPPER"), 5);
  });
});

test("an empty transfer is refused", { skip }, async () => {
  await withRollback(async (tx) => {
    const senderId = await withMinerals(tx, "sendempty", "COPPER", 2);
    const recipientId = await makeProfile(tx, { username: "sendemptyto" });
    await tx.become("authenticated", senderId);
    const refused = await tx.attempt(
      `select public.send_minerals($1, $2::jsonb)`,
      [recipientId, JSON.stringify({})],
    );
    await tx.query("reset role");
    assert.equal(
      refused,
      "22023",
      "an empty send created a receipt for nothing",
    );
  });
});

test("sending to yourself is refused", { skip }, async () => {
  await withRollback(async (tx) => {
    // Harmless arithmetically, and still worth refusing: a self-transfer is a
    // row in two people's history where one of them is the same person.
    const senderId = await withMinerals(tx, "sendself", "COPPER", 2);
    await tx.become("authenticated", senderId);
    const refused = await tx.attempt(
      `select public.send_minerals($1, $2::jsonb)`,
      [senderId, JSON.stringify({ COPPER: 1 })],
    );
    await tx.query("reset role");
    assert.equal(refused, "22023");
  });
});

test("the ledger cannot be written directly", { skip }, async () => {
  await withRollback(async (tx) => {
    // The balance is derived from these two tables, so an account that can
    // insert into either can mint minerals.
    const senderId = await withMinerals(tx, "sendcheat", "COPPER", 1);
    const recipientId = await makeProfile(tx, { username: "sendcheatto" });
    await tx.become("authenticated", senderId);
    const transfer = await tx.attempt(
      `insert into public.mineral_transfers (sender_id, recipient_id)
       values ($1, $2)`,
      [recipientId, senderId],
    );
    await tx.query("reset role");
    assert.equal(transfer, "42501");
  });
});

test(
  "a transfer is visible only to the two accounts in it",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // A wallet is public because a collection is meant to be seen. Who sent
      // what to whom is a different question, and the answer belongs to the pair.
      const senderId = await withMinerals(tx, "sendprivate", "COPPER", 2);
      const recipientId = await makeProfile(tx, { username: "sendprivateto" });
      const strangerId = await makeProfile(tx, { username: "sendstranger" });

      await tx.become("authenticated", senderId);
      await tx.query(`select public.send_minerals($1, $2::jsonb)`, [
        recipientId,
        JSON.stringify({ COPPER: 1 }),
      ]);
      const mine = await tx.query(`select id from public.mineral_transfers`);
      await tx.query("reset role");

      await tx.become("authenticated", recipientId);
      const theirs = await tx.query(`select id from public.mineral_transfers`);
      await tx.query("reset role");

      await tx.become("authenticated", strangerId);
      const stranger = await tx.query(
        `select id from public.mineral_transfers`,
      );
      await tx.query("reset role");

      assert.equal(mine.length, 1);
      assert.equal(
        theirs.length,
        1,
        "the recipient cannot see what they received",
      );
      assert.equal(
        stranger.length,
        0,
        "a stranger can read other people's transfers",
      );
    });
  },
);

test("a notification reaches the recipient", { skip }, async () => {
  await withRollback(async (tx) => {
    // The kind list is a check constraint, so a kind added without restating
    // the list fails the insert and takes the whole transfer with it.
    const senderId = await withMinerals(tx, "sendnotify", "COPPER", 2);
    const recipientId = await makeProfile(tx, { username: "sendnotifyto" });

    await tx.become("authenticated", senderId);
    await tx.query(`select public.send_minerals($1, $2::jsonb)`, [
      recipientId,
      JSON.stringify({ COPPER: 1 }),
    ]);
    await tx.query("reset role");

    const [note] = await tx.query<{ kind: string; actor_id: string }>(
      `select kind, actor_id from public.notifications where recipient_id = $1`,
      [recipientId],
    );
    assert.ok(note, "the recipient was never told");
    assert.equal(note.kind, "mineral_transfer");
    assert.equal(note.actor_id, senderId);
  });
});

test("the wallet history query resolves as written", { skip }, async () => {
  await withRollback(async (tx) => {
    // The client selects both profile joins by constraint name. A wrong hint
    // is not a type error and not a runtime crash: PostgREST refuses the whole
    // request and the panel renders empty, which is how a broken embed once
    // shipped here unnoticed.
    const names = await tx.query<{ conname: string }>(
      `select conname from pg_constraint c
         join pg_class t on t.oid = c.conrelid
        where t.relname = 'mineral_transfers' and c.contype = 'f'`,
    );
    const found = names.map((row) => row.conname).sort();
    assert.deepEqual(found, [
      "mineral_transfers_recipient_id_fkey",
      "mineral_transfers_sender_id_fkey",
    ]);

    // And the join itself returns what the panel draws.
    const senderId = await withMinerals(tx, "sendembed", "COPPER", 2);
    const recipientId = await makeProfile(tx, { username: "sendembedto" });
    await tx.become("authenticated", senderId);
    await tx.query(`select public.send_minerals($1, $2::jsonb, $3)`, [
      recipientId,
      JSON.stringify({ COPPER: 1 }),
      "hello",
    ]);
    const rows = await tx.query<{
      note: string;
      amount: number;
      username: string;
    }>(
      `select t.note, i.amount, p.username
         from public.mineral_transfers t
         join public.mineral_transfer_items i on i.transfer_id = t.id
         join public.profiles p on p.id = t.recipient_id
        where t.sender_id = $1`,
      [senderId],
    );
    await tx.query("reset role");

    assert.equal(rows.length, 1);
    assert.equal(rows[0].note, "hello");
    assert.equal(rows[0].amount, 1);
    assert.equal(rows[0].username, "sendembedto");
  });
});
