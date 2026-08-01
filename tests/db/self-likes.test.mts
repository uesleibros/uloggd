import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * Liking your own posts.
 *
 * Every branch of `toggle_content_like` used to carry `profile_id <>
 * auth.uid()` and answer "content not found", which is a refusal nobody asked
 * for stated in a misleading way. A like here is a bookmark as much as an
 * endorsement, and the counts are public and small, so someone padding their
 * own is visible to anyone looking.
 *
 * What must not change is the rest: nobody is notified of their own like, and
 * removing the owner clause must not have opened anything else. Those are the
 * two things this pins, because they are what a careless version of this change
 * would break.
 */
test(
  "an author can like and unlike their own post, and is not notified",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const [review] = await tx.query<{ id: string; profile_id: string }>(
        `select id, profile_id from public.reviews limit 1`,
      );
      assert.ok(review, "no review to test with");

      await tx.query(
        `delete from public.content_likes
          where profile_id = $1 and content_type = 'review' and content_id = $2`,
        [review.profile_id, review.id],
      );
      await tx.query(
        `delete from public.notifications
          where recipient_id = $1 and actor_id = $1 and kind = 'review_like'`,
        [review.profile_id],
      );

      await tx.become("authenticated", review.profile_id);
      const [liked] = await tx.query<{ liked: boolean; like_count: string }>(
        `select * from public.toggle_content_like('review', $1)`,
        [review.id],
      );
      assert.equal(
        liked.liked,
        true,
        "the author could not like their own post",
      );

      const [unliked] = await tx.query<{ liked: boolean }>(
        `select * from public.toggle_content_like('review', $1)`,
        [review.id],
      );
      assert.equal(unliked.liked, false, "the author could not undo it");
      await tx.query("reset role");

      const notifications = await tx.query(
        `select id from public.notifications
          where recipient_id = $1 and actor_id = $1 and kind = 'review_like'`,
        [review.profile_id],
      );
      assert.equal(
        notifications.length,
        0,
        "the author was notified about their own like",
      );
    });
  },
);

test(
  "an author can like their own private entry, and nobody else can",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // The diary branch checks visibility inline rather than through the shared
    // function, so the author case had to be stated explicitly. Getting that
    // wrong in either direction is the risk: locking authors out of their own
    // private entries, or letting strangers reach them.
    await withRollback(async (tx) => {
      const [entry] = await tx.query<{ id: string; profile_id: string }>(
        `select id, profile_id from public.diary_entries limit 1`,
      );
      assert.ok(entry, "no diary entry to test with");
      const { other } = await subjects(tx);
      assert.notEqual(entry.profile_id, other.id, "need two distinct accounts");

      await tx.query(
        `update public.diary_entries set visibility = 'PRIVATE' where id = $1`,
        [entry.id],
      );

      await tx.become("authenticated", entry.profile_id);
      assert.equal(
        await tx.attempt(
          `select * from public.toggle_content_like('diary', $1)`,
          [entry.id],
        ),
        null,
        "the author cannot like their own private entry",
      );
      await tx.query("reset role");

      await tx.become("authenticated", other.id);
      assert.ok(
        await tx.attempt(
          `select * from public.toggle_content_like('diary', $1)`,
          [entry.id],
        ),
        "a stranger can like someone else's private entry",
      );
    });
  },
);
