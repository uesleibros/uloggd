import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback, type Tx } from "./harness.mts";

/**
 * The number the feed prints beside a post.
 *
 * A count is a weaker disclosure than the text it counts, but it is the same
 * disclosure: "three replies" on a review nobody outside a follower list may
 * open still says a conversation is happening there. So it rides on the same
 * visibility gate as the listing, and these tests are mostly about the cases
 * where the answer has to be nothing.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

async function makeReview(
  tx: Tx,
  author: string,
  visibility: "PUBLIC" | "FOLLOWERS" = "PUBLIC",
) {
  const [row] = await tx.query<{ id: string }>(
    `insert into public.reviews (profile_id, igdb_id, game_slug, rating, content, visibility)
     values ($1, 960001, 'g-960001', 80, 'Mine.', $2) returning id`,
    [author, visibility],
  );
  return row.id;
}

async function comment(tx: Tx, review: string, author: string, body: string) {
  const [row] = await tx.query<{ id: string }>(
    `insert into public.content_comments (content_type, content_id, author_id, body)
     values ('review', $1, $2, $3) returning id`,
    [review, author, body],
  );
  return row.id;
}

async function countFor(tx: Tx, viewer: string | null, ids: string[]) {
  if (viewer) await tx.become("authenticated", viewer);
  else await tx.become("anon");
  const rows = await tx.query<{ content_id: string; comment_count: string }>(
    `select * from public.get_content_comment_counts('review', $1::uuid[])`,
    [ids],
  );
  await tx.query("reset role");
  return new Map(
    rows.map((row) => [row.content_id, Number(row.comment_count)]),
  );
}

test("it counts the replies a post has", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { username: "cccauthor" });
    const reader = await makeProfile(tx, { username: "cccreader" });
    const review = await makeReview(tx, author);
    await comment(tx, review, reader, "first");
    await comment(tx, review, author, "second");

    assert.equal((await countFor(tx, reader, [review])).get(review), 2);
  });
});

test("a post with no replies still gets a row", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { username: "cccquiet" });
    const review = await makeReview(tx, author);
    const counts = await countFor(tx, author, [review]);
    // A missing row and a zero mean the same thing to a caller that defaults,
    // but the feed maps its ids against this and a hole is easier to misread
    // than a zero.
    assert.equal(counts.get(review), 0);
  });
});

test("deleted replies are not advertised", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { username: "cccgone" });
    const reader = await makeProfile(tx, { username: "cccgonereader" });
    const review = await makeReview(tx, author);
    const first = await comment(tx, review, reader, "here");
    await comment(tx, review, reader, "also here");
    // Blanked as well as flagged, which is the shape a real delete leaves: a
    // check constraint on the table insists a removed comment carries no text.
    await tx.query(
      `update public.content_comments set deleted_at = now(), body = '' where id = $1`,
      [first],
    );
    // A tombstone reads honestly inside an open thread. Counting it would
    // promise a conversation that is not there when you arrive.
    assert.equal((await countFor(tx, reader, [review])).get(review), 1);
  });
});

test(
  "a followers-only post counts nothing for a stranger",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const author = await makeProfile(tx, { username: "cccscoped" });
      const reader = await makeProfile(tx, { username: "cccstranger" });
      const review = await makeReview(tx, author, "FOLLOWERS");
      await comment(tx, review, author, "mine");

      assert.equal((await countFor(tx, reader, [review])).get(review), 0);
      assert.equal((await countFor(tx, null, [review])).get(review), 0);
      // The author always sees their own.
      assert.equal((await countFor(tx, author, [review])).get(review), 1);

      await tx.query(
        `insert into public.follows (follower_id, following_id) values ($1, $2)`,
        [reader, author],
      );
      assert.equal((await countFor(tx, reader, [review])).get(review), 1);
    });
  },
);

test("a block silences the count both ways", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { username: "cccblockauthor" });
    const reader = await makeProfile(tx, { username: "cccblockreader" });
    const review = await makeReview(tx, author);
    await comment(tx, review, author, "mine");

    assert.equal((await countFor(tx, reader, [review])).get(review), 1);
    await tx.query(
      `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`,
      [reader, author],
    );
    assert.equal((await countFor(tx, reader, [review])).get(review), 0);
  });
});

test("signed-out readers may ask", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { username: "cccanon" });
    const review = await makeReview(tx, author);
    await comment(tx, review, author, "public");
    // Deliberately granted to anon: feeds render for visitors who have not
    // joined, and a card that hides its reply count from them is a card that
    // hides the conversation from exactly the person being invited into it.
    assert.equal((await countFor(tx, null, [review])).get(review), 1);
  });
});
