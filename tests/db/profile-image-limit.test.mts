import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The cooldown on changing a picture.
 *
 * An avatar is drawn beside every comment its owner has ever written, so
 * cycling it makes a whole thread flicker for everyone reading. The limit is
 * counted from its own log rather than from `profile_image_history`, which
 * keeps five slots and updates a row when an old picture is reused: it can
 * neither count past five nor notice a reuse, which are the two things this
 * has to see.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

test("the sixth change in the window is refused", { skip }, async () => {
  await withRollback(async (tx) => {
    const ownerId = await makeProfile(tx, { username: "imagelimit" });
    await tx.become("authenticated", ownerId);

    for (let attempt = 1; attempt <= 5; attempt++) {
      const [row] = await tx.query<{ claim_profile_image_change: number }>(
        `select public.claim_profile_image_change('AVATAR')`,
      );
      assert.equal(
        row.claim_profile_image_change,
        0,
        `change ${attempt} was refused before the limit`,
      );
    }
    const [sixth] = await tx.query<{ claim_profile_image_change: number }>(
      `select public.claim_profile_image_change('AVATAR')`,
    );
    await tx.query("reset role");

    assert.ok(
      sixth.claim_profile_image_change > 0,
      "the sixth change was allowed",
    );
    // The wait has to be a real number of seconds, since the interface turns
    // it into "try again in N minutes" rather than a generic failure.
    assert.ok(
      sixth.claim_profile_image_change <= 600,
      `the wait is ${sixth.claim_profile_image_change}s, longer than the window`,
    );
  });
});

test("avatar and banner share one allowance", { skip }, async () => {
  await withRollback(async (tx) => {
    // Alternating them is the same thing to the same readers, and two separate
    // allowances would only double the ceiling.
    const ownerId = await makeProfile(tx, { username: "imagealternate" });
    await tx.become("authenticated", ownerId);
    for (let attempt = 0; attempt < 5; attempt++)
      await tx.query(`select public.claim_profile_image_change($1)`, [
        attempt % 2 === 0 ? "AVATAR" : "BANNER",
      ]);
    const [next] = await tx.query<{ claim_profile_image_change: number }>(
      `select public.claim_profile_image_change('BANNER')`,
    );
    await tx.query("reset role");
    assert.ok(
      next.claim_profile_image_change > 0,
      "alternating kinds got a second allowance",
    );
  });
});

test("one account's changes do not limit another's", { skip }, async () => {
  await withRollback(async (tx) => {
    const busyId = await makeProfile(tx, { username: "imagebusy" });
    const quietId = await makeProfile(tx, { username: "imagequiet" });

    await tx.become("authenticated", busyId);
    for (let attempt = 0; attempt < 5; attempt++)
      await tx.query(`select public.claim_profile_image_change('AVATAR')`);
    await tx.query("reset role");

    await tx.become("authenticated", quietId);
    const [row] = await tx.query<{ claim_profile_image_change: number }>(
      `select public.claim_profile_image_change('AVATAR')`,
    );
    await tx.query("reset role");
    assert.equal(row.claim_profile_image_change, 0);
  });
});

test("the log cannot be cleared to lift the limit", { skip }, async () => {
  await withRollback(async (tx) => {
    // The whole limit is a count over this table. An account that can delete
    // its own rows has no limit at all.
    const ownerId = await makeProfile(tx, { username: "imagecheat" });
    await tx.become("authenticated", ownerId);
    await tx.query(`select public.claim_profile_image_change('AVATAR')`);
    const deleted = await tx.attempt(
      `delete from public.profile_image_changes where profile_id = $1`,
      [ownerId],
    );
    const read = await tx.attempt(
      `select count(*) from public.profile_image_changes`,
    );
    await tx.query("reset role");
    assert.equal(deleted, "42501", "an account can clear its own change log");
    assert.equal(read, "42501", "the change log is readable from the API");
  });
});

test("it is refused signed out", { skip }, async () => {
  await withRollback(async (tx) => {
    await tx.become("anon");
    const refused = await tx.attempt(
      `select public.claim_profile_image_change('AVATAR')`,
    );
    await tx.query("reset role");
    assert.equal(refused, "42501");
  });
});
