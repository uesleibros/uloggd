import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * Who can read a library, across all three settings.
 *
 * The middle one is new. `library_visibility` was always the same three-value
 * type as every other visibility here, but the policy only ever checked for
 * PUBLIC, so choosing followers-only would have behaved as private while the
 * interface claimed otherwise. A privacy control that does not do what it says
 * is the one kind of bug people cannot detect for themselves, which is why the
 * option is only offered now and why this test exists.
 */
async function visible(
  tx: Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>,
  ownerId: string,
  viewerId: string | null,
) {
  await tx.query("reset role");
  if (viewerId) await tx.become("authenticated", viewerId);
  else await tx.become("anon");
  const rows = await tx.query(
    `select igdb_id from public.user_games where profile_id = $1`,
    [ownerId],
  );
  await tx.query("reset role");
  return rows.length;
}

test(
  "a library follows its visibility setting for every kind of viewer",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const [owner] = await tx.query<{ id: string }>(
        `select profile_id as id from public.user_games group by profile_id
         order by count(*) desc limit 1`,
      );
      assert.ok(owner, "no account owns a library to test with");
      const others = await tx.query<{ id: string }>(
        `select id from public.profiles where id <> $1 order by created_at limit 2`,
        [owner.id],
      );
      const [follower, stranger] = others;
      assert.ok(follower && stranger, "need two other accounts");

      await tx.query(
        `delete from public.follows where following_id = $1 and follower_id = any($2::uuid[])`,
        [owner.id, [follower.id, stranger.id]],
      );
      await tx.query(
        `insert into public.follows (follower_id, following_id) values ($1, $2)`,
        [follower.id, owner.id],
      );

      const set = (value: string) =>
        tx.query(
          `update public.profiles set library_visibility = $1 where id = $2`,
          [value, owner.id],
        );

      await set("PUBLIC");
      assert.ok(
        (await visible(tx, owner.id, null)) > 0,
        "a public library is hidden from anonymous visitors",
      );
      assert.ok((await visible(tx, owner.id, stranger.id)) > 0);

      await set("FOLLOWERS");
      assert.ok(
        (await visible(tx, owner.id, follower.id)) > 0,
        "a follower cannot see a followers-only library",
      );
      assert.equal(
        await visible(tx, owner.id, stranger.id),
        0,
        "a stranger can see a followers-only library",
      );
      assert.equal(
        await visible(tx, owner.id, null),
        0,
        "an anonymous visitor can see a followers-only library",
      );
      assert.ok(
        (await visible(tx, owner.id, owner.id)) > 0,
        "the owner cannot see their own library",
      );

      await set("PRIVATE");
      assert.equal(
        await visible(tx, owner.id, follower.id),
        0,
        "a follower can see a private library",
      );
      assert.ok((await visible(tx, owner.id, owner.id)) > 0);
    });
  },
);

test(
  "unfollowing takes the library away again",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // The policy reads the current relationship rather than anything stored at
    // the time of following, so this is the behaviour someone expects when they
    // remove a follower.
    await withRollback(async (tx) => {
      const [owner] = await tx.query<{ id: string }>(
        `select profile_id as id from public.user_games group by profile_id limit 1`,
      );
      const { other } = await subjects(tx);
      assert.notEqual(owner.id, other.id, "need two distinct accounts");

      await tx.query(
        `update public.profiles set library_visibility = 'FOLLOWERS' where id = $1`,
        [owner.id],
      );
      await tx.query(
        `insert into public.follows (follower_id, following_id) values ($1, $2)
         on conflict do nothing`,
        [other.id, owner.id],
      );
      assert.ok((await visible(tx, owner.id, other.id)) > 0);

      await tx.query(
        `delete from public.follows where follower_id = $1 and following_id = $2`,
        [other.id, owner.id],
      );
      assert.equal(
        await visible(tx, owner.id, other.id),
        0,
        "the library stayed visible after unfollowing",
      );
    });
  },
);
