import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, withRollback, type Tx } from "./harness.mts";

/**
 * What a stranger can see of someone's journal, reviews, screenshots and lists.
 *
 * These are row-level rules, so unlike the column privileges they are expressed
 * in policies, and a policy is easy to widen by accident: `using (true)` reads
 * as "this table is public" and is how every profile's birth date ended up
 * readable.
 *
 * The author is discovered from the row rather than assumed, because the first
 * version of this test picked an account that owned nothing, checked zero rows,
 * and passed. Both tests now count what they actually examined and fail if that
 * is nothing, so an empty database reports itself instead of reporting success.
 */
const SURFACES = ["diary_entries", "reviews", "screenshots", "game_lists"];

type Row = { id: string; profile_id: string };

/** A row on each surface, with the account that owns it. */
async function ownedRows(tx: Tx) {
  const found: { table: string; row: Row }[] = [];
  for (const table of SURFACES) {
    const [row] = await tx.query<Row>(
      `select id, profile_id from public.${table} order by created_at limit 1`,
    );
    if (row) found.push({ table, row });
  }
  return found;
}

test(
  "private content is invisible to anonymous visitors",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const rows = await ownedRows(tx);
      assert.ok(
        rows.length > 0,
        "no content existed, so this test proved nothing",
      );

      for (const { table, row } of rows) {
        // Flipped inside the transaction and undone by the rollback, so the test
        // does not depend on a private row happening to exist.
        await tx.query(
          `update public.${table} set visibility = 'PRIVATE' where id = $1`,
          [row.id],
        );

        await tx.become("anon");
        const visible = await tx.query(
          `select id from public.${table} where id = $1`,
          [row.id],
        );
        assert.equal(
          visible.length,
          0,
          `a PRIVATE row in ${table} is readable by anyone with the publishable key`,
        );

        await tx.become("authenticated", row.profile_id);
        const mine = await tx.query(
          `select id from public.${table} where id = $1`,
          [row.id],
        );
        assert.equal(
          mine.length,
          1,
          `the author cannot see their own PRIVATE row in ${table}`,
        );

        await tx.query("reset role");
      }
    });
  },
);

test(
  "a stranger cannot read another account's private row",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const rows = await ownedRows(tx);
      assert.ok(
        rows.length > 0,
        "no content existed, so this test proved nothing",
      );

      let checked = 0;
      for (const { table, row } of rows) {
        const [stranger] = await tx.query<{ id: string }>(
          `select id from public.profiles
         where id <> $1
           and not exists (
             select 1 from public.blocks
             where (blocker_id = $1 and blocked_id = profiles.id)
                or (blocker_id = profiles.id and blocked_id = $1)
           )
         limit 1`,
          [row.profile_id],
        );
        if (!stranger) continue;
        checked += 1;

        await tx.query(
          `update public.${table} set visibility = 'PRIVATE' where id = $1`,
          [row.id],
        );
        await tx.become("authenticated", stranger.id);
        const visible = await tx.query(
          `select id from public.${table} where id = $1`,
          [row.id],
        );
        assert.equal(
          visible.length,
          0,
          `any signed-in account can read a PRIVATE row in ${table}`,
        );
        await tx.query("reset role");
      }

      assert.ok(checked > 0, "found no stranger to test against");
    });
  },
);
