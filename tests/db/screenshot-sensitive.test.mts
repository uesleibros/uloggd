import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The sensitive flag on a screenshot, and who is allowed to move it.
 *
 * `sensitive` is the author's to change; `sensitive_detected` records that the
 * automatic check set it and is deliberately not theirs to rewrite, so a false
 * positive stays distinguishable from a deliberate mark when someone
 * complains. That distinction only exists as a column privilege, which is
 * exactly the kind of thing that gets granted back by accident.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

test(
  "an author can change the flag but not the record of who set it",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // Created here rather than found: there are no screenshots right now, and
      // a version of this test that looked for one passed by doing nothing at
      // all, which is worse than having no test.
      const ownerId = await makeProfile(tx, { username: "shotowner" });
      const [shot] = await tx.query<{ id: string }>(
        `insert into public.screenshots
         (profile_id, igdb_id, game_slug, width, height, image_url, sensitive_detected)
       values ($1, 101, 'a-game', 1920, 1080, 'https://cdn.imgchest.com/files/test-a.webp', true)
       returning id`,
        [ownerId],
      );

      await tx.become("authenticated", ownerId);
      const own = await tx.attempt(
        `update public.screenshots set sensitive = true where id = $1`,
        [shot.id],
      );
      const record = await tx.attempt(
        `update public.screenshots set sensitive_detected = false where id = $1`,
        [shot.id],
      );
      await tx.query("reset role");

      assert.ok(shot, "the screenshot was not created");
      assert.equal(
        own,
        null,
        `the author could not set their own flag: ${own}`,
      );
      assert.equal(
        record,
        "42501",
        "the author was able to rewrite what the automatic check recorded",
      );
    });
  },
);

test("the flag is readable without an account", { skip }, async () => {
  await withRollback(async (tx) => {
    // A cover that only appears for signed-in visitors would leave the image
    // uncovered for exactly the people with no account, which is the wrong way
    // round for a control that exists to protect minors.
    const ownerId = await makeProfile(tx, { username: "shotpublic" });
    await tx.query(
      `insert into public.screenshots
         (profile_id, igdb_id, game_slug, width, height, image_url, visibility)
       values ($1, 102, 'b-game', 1920, 1080, 'https://cdn.imgchest.com/files/test-b.webp', 'PUBLIC')`,
      [ownerId],
    );
    await tx.become("anon");
    const rows = await tx.query<{ sensitive: boolean }>(
      `select sensitive from public.screenshots where profile_id = $1`,
      [ownerId],
    );
    const refused = await tx.attempt(
      `select sensitive from public.screenshots where profile_id = $1`,
      [ownerId],
    );
    await tx.query("reset role");
    assert.equal(refused, null, `anon was refused with ${refused}`);
    assert.equal(rows.length, 1, "anon could not see the public screenshot");
    assert.equal(rows[0].sensitive, false);
  });
});

test(
  "the edit the app actually makes still goes through",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // Revoking UPDATE on the table and granting columns back is how the flag
      // is protected, and it is also how this project once broke every
      // signed-in page. `ScreenshotActions` writes exactly these three columns
      // in one statement, and PostgREST fails the whole statement over one
      // missing column privilege.
      const ownerId = await makeProfile(tx, { username: "shoteditor" });
      const [shot] = await tx.query<{ id: string }>(
        `insert into public.screenshots
         (profile_id, igdb_id, game_slug, width, height, image_url)
       values ($1, 103, 'c-game', 1920, 1080, 'https://cdn.imgchest.com/files/test-c.webp')
       returning id`,
        [ownerId],
      );

      await tx.become("authenticated", ownerId);
      const refused = await tx.attempt(
        `update public.screenshots
          set description = 'edited', contains_spoilers = true, visibility = 'FOLLOWERS'
        where id = $1`,
        [shot.id],
      );
      await tx.query("reset role");
      assert.equal(
        refused,
        null,
        `the app's own edit was refused with ${refused}: a column it writes is not granted`,
      );
    });
  },
);

test(
  "a session flag can be moved but its origin cannot be erased",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // `mark_diary_sensitive` is definer so it can write a column the author is
      // not granted. The property worth holding is one-way: the flag moves
      // freely, the record that the check raised it only ever goes true.
      const ownerId = await makeProfile(tx, { username: "sessionowner" });
      const [entry] = await tx.query<{ id: string }>(
        `insert into public.diary_entries (profile_id, igdb_id, game_slug, played_on)
       values ($1, 201, 'd-game', current_date) returning id`,
        [ownerId],
      );

      await tx.become("authenticated", ownerId);
      await tx.query(`select public.mark_diary_sensitive($1, true, true)`, [
        entry.id,
      ]);
      const [marked] = await tx.query<{
        sensitive: boolean;
        sensitive_detected: boolean;
      }>(
        `select sensitive, sensitive_detected from public.diary_entries where id = $1`,
        [entry.id],
      );

      // The author turning it back off must not take the record with it.
      await tx.query(`select public.mark_diary_sensitive($1, false, false)`, [
        entry.id,
      ]);
      const [cleared] = await tx.query<{
        sensitive: boolean;
        sensitive_detected: boolean;
      }>(
        `select sensitive, sensitive_detected from public.diary_entries where id = $1`,
        [entry.id],
      );

      const direct = await tx.attempt(
        `update public.diary_entries set sensitive_detected = false where id = $1`,
        [entry.id],
      );
      await tx.query("reset role");

      assert.equal(marked.sensitive, true);
      assert.equal(marked.sensitive_detected, true);
      assert.equal(
        cleared.sensitive,
        false,
        "the author cannot clear the flag",
      );
      assert.equal(
        cleared.sensitive_detected,
        true,
        "turning the flag off erased the record that the check raised it",
      );
      assert.equal(
        direct,
        "42501",
        "the author can rewrite the record by updating the row directly",
      );
    });
  },
);

test("someone else's session cannot be marked", { skip }, async () => {
  await withRollback(async (tx) => {
    const ownerId = await makeProfile(tx, { username: "sessionvictim" });
    const strangerId = await makeProfile(tx, { username: "sessionstranger" });
    const [entry] = await tx.query<{ id: string }>(
      `insert into public.diary_entries (profile_id, igdb_id, game_slug, played_on)
       values ($1, 202, 'e-game', current_date) returning id`,
      [ownerId],
    );

    await tx.become("authenticated", strangerId);
    const refused = await tx.attempt(
      `select public.mark_diary_sensitive($1, true, false)`,
      [entry.id],
    );
    await tx.query("reset role");
    assert.equal(
      refused,
      "42501",
      "a definer function that skips the ownership check marks anyone's entry",
    );
  });
});
