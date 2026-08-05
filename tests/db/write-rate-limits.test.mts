import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The ceiling on how fast one account can act on other people.
 *
 * Comments, follows and likes each ring somebody else's bell. Without a limit,
 * the notification inbox is a harassment tool that needs no account older than
 * a minute.
 *
 * Comments on content are the case worth exercising end to end.
 * `create_profile_comment` already had its own ceiling and keeps it; the ones
 * on reviews, lists and screenshots had none.
 *
 * The numbers below are deliberately the real ones. A test that invented its
 * own would pass while the shipped allowance was a thousand.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

/**
 * A review to comment on, owned by `author`, open to everyone.
 *
 * Written directly rather than through `create_review`, which carries its own
 * limits and would be a second thing under test.
 */
async function makeReview(
  tx: Parameters<Parameters<typeof withRollback>[0]>[0],
  author: string,
) {
  const [row] = await tx.query<{ id: string }>(
    `insert into public.reviews (profile_id, igdb_id, game_slug, content, visibility)
     values ($1, 1942, 'test-game', 'a review', 'PUBLIC')
     returning id`,
    [author],
  );
  return row.id;
}

/** Comments until something stops it, returning the SQLSTATE and the count. */
async function floodComments(
  tx: Parameters<Parameters<typeof withRollback>[0]>[0],
  reviewId: string,
  count: number,
) {
  for (let index = 0; index < count; index++) {
    const failure = await tx.attempt(
      `select public.create_content_comment('review', $1, $2, null)`,
      [reviewId, `comment ${index}`],
    );
    if (failure) return { failure, at: index };
  }
  return { failure: null, at: count };
}

test(
  "a comment flood is stopped, and says how long to wait",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { username: "floodtarget" });
      const flooder = await makeProfile(tx, { username: "floodauthor" });
      const review = await makeReview(tx, owner);

      await tx.become("authenticated", flooder);
      const { failure, at } = await floodComments(tx, review, 40);
      await tx.query("reset role");

      assert.equal(
        failure,
        "53400",
        `the flood was never stopped (wrote ${at})`,
      );
      // Fifteen in five minutes is the shipped allowance; the sixteenth is what
      // has to fail. Asserting the exact number is the point: a limit nobody
      // checks drifts to a thousand and stops being one.
      assert.equal(at, 15, `stopped after ${at} comments, expected 15`);
    });
  },
);

test("the limit is per account, not global", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { username: "floodvictim" });
    const first = await makeProfile(tx, { username: "flooderone" });
    const second = await makeProfile(tx, { username: "floodertwo" });
    const review = await makeReview(tx, owner);

    await tx.become("authenticated", first);
    await floodComments(tx, review, 20);
    await tx.query("reset role");

    // One account hitting its ceiling must not silence everybody else, which
    // is what a limit keyed on the wrong column would do.
    await tx.become("authenticated", second);
    const failure = await tx.attempt(
      `select public.create_content_comment('review', $1, 'hello', null)`,
      [review],
    );
    await tx.query("reset role");
    assert.equal(failure, null, "one account's flood blocked another account");
  });
});

test("each action has its own budget", { skip }, async () => {
  await withRollback(async (tx) => {
    const target = await makeProfile(tx, { username: "budgettarget" });
    const actor = await makeProfile(tx, { username: "budgetactor" });
    const review = await makeReview(tx, target);

    await tx.become("authenticated", actor);
    await floodComments(tx, review, 20);
    // Comments are spent. Following is a different budget and must still work,
    // or one noisy thread would lock somebody out of the rest of the site.
    const failure = await tx.attempt(`select public.request_follow($1)`, [
      target,
    ]);
    await tx.query("reset role");
    assert.equal(failure, null, "spending one budget spent another");
  });
});

test("the limiter is unreachable from the API", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { username: "limitreach" });
    await tx.become("authenticated", id);
    // An account that could call the limiter could burn its own budget, and
    // one that could read or delete the log could lift its own ceiling.
    assert.equal(
      await tx.attempt(
        `select private.claim_rate_limit('comment', 1, interval '1 hour')`,
      ),
      "42501",
    );
    assert.equal(
      await tx.attempt(`select count(*) from private.rate_events`),
      "42501",
    );
    await tx.query("reset role");
  });
});

test("nothing is counted for a caller with no session", { skip }, async () => {
  await withRollback(async (tx) => {
    // The limiter returns early without a session rather than raising, so a
    // trigger on a table written by a backfill or a migration cannot fail.
    const [{ n: before }] = await tx.query<{ n: string }>(
      `select count(*)::text as n from private.rate_events`,
    );
    await tx.query(
      `select private.claim_rate_limit('comment', 1, interval '1 hour')`,
    );
    const [{ n: after }] = await tx.query<{ n: string }>(
      `select count(*)::text as n from private.rate_events`,
    );
    assert.equal(
      before,
      after,
      "a sessionless call was counted against nobody",
    );
  });
});
