import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, withRollback, type Tx } from "./harness.mts";

/**
 * The private library setting, enforced where it counts.
 *
 * `user_games` had two select policies: one that checked `library_visibility`
 * and one that was `using (true)`. Permissive policies combine with OR, so the
 * blanket one granted everything and the careful one decided nothing. The
 * library page checked the setting itself, so the site looked correct while
 * the API served the whole library of anyone who had marked it private.
 *
 * A policy that is shadowed rather than absent is the hard case to notice, so
 * this test exercises the outcome from all four sides instead of reading the
 * policy list.
 */
async function libraryOwners(tx: Tx) {
  return tx.query<{ id: string }>(
    `select id from public.profiles
     where exists (select 1 from public.user_games where profile_id = profiles.id)
     order by created_at limit 2`,
  );
}

test(
  "a private library is hidden from everyone but its owner",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const owners = await libraryOwners(tx);
      assert.equal(
        owners.length,
        2,
        "need two accounts with libraries to tell hidden from empty",
      );
      const [subject, stranger] = owners;

      await tx.query(
        `update public.profiles set library_visibility = 'PRIVATE' where id = $1`,
        [subject.id],
      );

      await tx.become("anon");
      assert.equal(
        (
          await tx.query(
            `select 1 from public.user_games where profile_id = $1`,
            [subject.id],
          )
        ).length,
        0,
        "anyone with the publishable key can read a private library",
      );
      await tx.query("reset role");

      await tx.become("authenticated", stranger.id);
      assert.equal(
        (
          await tx.query(
            `select 1 from public.user_games where profile_id = $1`,
            [subject.id],
          )
        ).length,
        0,
        "any signed-in account can read a private library",
      );
      await tx.query("reset role");

      await tx.become("authenticated", subject.id);
      assert.ok(
        (
          await tx.query(
            `select 1 from public.user_games where profile_id = $1`,
            [subject.id],
          )
        ).length > 0,
        "the owner cannot see their own library",
      );
      await tx.query("reset role");
    });
  },
);

test(
  "a public library stays readable by strangers and visitors",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // The mirror. Without it, dropping every policy would satisfy the test
    // above while hiding every library on the site.
    await withRollback(async (tx) => {
      const owners = await libraryOwners(tx);
      assert.equal(owners.length, 2, "need two accounts with libraries");
      const [subject, stranger] = owners;

      await tx.query(
        `update public.profiles set library_visibility = 'PUBLIC' where id = $1`,
        [subject.id],
      );

      await tx.become("anon");
      assert.ok(
        (
          await tx.query(
            `select 1 from public.user_games where profile_id = $1`,
            [subject.id],
          )
        ).length > 0,
        "a public library is invisible to anonymous visitors",
      );
      await tx.query("reset role");

      await tx.become("authenticated", stranger.id);
      assert.ok(
        (
          await tx.query(
            `select 1 from public.user_games where profile_id = $1`,
            [subject.id],
          )
        ).length > 0,
        "a public library is invisible to signed-in visitors",
      );
      await tx.query("reset role");
    });
  },
);
