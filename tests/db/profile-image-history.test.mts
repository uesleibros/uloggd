import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * The last few avatars and banners an account used.
 *
 * Five slots per kind, oldest evicted. The ordering is the whole feature, and
 * it was wrong in the first version: `created_at` defaulted to `now()`, which
 * returns the start of the transaction, so several changes in one transaction
 * shared an instant and the eviction kept the five *oldest*. `clock_timestamp()`
 * is what makes "most recent" mean anything, and this is the test that found
 * it.
 */
const IMAGE = (n: number) => `https://cdn.imgchest.com/files/history-${n}.webp`;

test(
  "only the five most recent are kept",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);

      for (let index = 1; index <= 7; index += 1)
        await tx.query(`select public.remember_profile_image('AVATAR', $1)`, [
          IMAGE(index),
        ]);

      const rows = await tx.query<{ image_url: string }>(
        `select image_url from public.profile_image_history
          where kind = 'AVATAR' order by created_at desc`,
      );
      assert.equal(rows.length, 5, "the slot limit is not being enforced");
      assert.deepEqual(
        rows.map((row) => row.image_url),
        [7, 6, 5, 4, 3].map(IMAGE),
        "the wrong five were kept, so eviction is dropping the newest",
      );
    });
  },
);

test(
  "using an old image again moves it forward without duplicating",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);
      for (let index = 1; index <= 3; index += 1)
        await tx.query(`select public.remember_profile_image('AVATAR', $1)`, [
          IMAGE(index),
        ]);

      await tx.query(`select public.remember_profile_image('AVATAR', $1)`, [
        IMAGE(1),
      ]);

      const rows = await tx.query<{ image_url: string }>(
        `select image_url from public.profile_image_history
          where kind = 'AVATAR' order by created_at desc`,
      );
      assert.equal(rows.length, 3, "reusing an image created a second slot");
      assert.equal(
        rows[0].image_url,
        IMAGE(1),
        "the reused image did not move to the front",
      );
    });
  },
);

test(
  "avatars and banners keep separate slots",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // Otherwise changing a banner five times would evict every avatar, which is
    // the sort of thing nobody notices until their pictures are gone.
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);
      for (let index = 1; index <= 5; index += 1)
        await tx.query(`select public.remember_profile_image('BANNER', $1)`, [
          IMAGE(index),
        ]);
      await tx.query(`select public.remember_profile_image('AVATAR', $1)`, [
        IMAGE(9),
      ]);

      const avatars = await tx.query(
        `select 1 from public.profile_image_history where kind = 'AVATAR'`,
      );
      const banners = await tx.query(
        `select 1 from public.profile_image_history where kind = 'BANNER'`,
      );
      assert.equal(avatars.length, 1);
      assert.equal(banners.length, 5);
    });
  },
);

test(
  "a history belongs to its owner alone",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // These are pictures someone chose to stop showing. The list of them is a
    // record of how they have presented themselves, which is not public the way
    // the current picture is.
    await withRollback(async (tx) => {
      const { ordinary, other } = await subjects(tx);
      assert.notEqual(ordinary.id, other.id, "need two distinct accounts");

      await tx.become("authenticated", ordinary.id);
      await tx.query(`select public.remember_profile_image('AVATAR', $1)`, [
        IMAGE(1),
      ]);
      await tx.query("reset role");

      await tx.become("authenticated", other.id);
      const seen = await tx.query(
        `select id from public.profile_image_history where profile_id = $1`,
        [ordinary.id],
      );
      assert.equal(seen.length, 0, "another account can read the history");
      await tx.query("reset role");

      await tx.become("anon");
      assert.ok(
        await tx.attempt(`select * from public.profile_image_history limit 1`),
        "anonymous visitors can read image histories",
      );
    });
  },
);

test(
  "an invalid kind is refused",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);
      assert.ok(
        await tx.attempt(`select public.remember_profile_image('COVER', $1)`, [
          IMAGE(1),
        ]),
        "an unknown image kind was accepted",
      );
    });
  },
);
