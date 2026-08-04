import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * What "the deletion landed" means on the profile comment list.
 *
 * Deleting a profile comment is a tombstone, not a disappearance:
 * `delete_profile_comment` blanks the body and stamps `deleted_at` so replies
 * keep their parent, and the row comes back in the next render still in the
 * list. The panel waited for it to stop arriving instead, which never happens,
 * so `pending` stayed set and every form on the page — new comment, reply,
 * edit — was disabled until the page was reloaded.
 *
 * Asserted against the source because reproducing it needs a DOM and a
 * round trip this project does not test with. The two facts that have to
 * agree are here, though: what the function does, and what the panel waits
 * for.
 */

const ROOT = process.cwd();

test("deleting a profile comment keeps the row and marks it", async () => {
  const sql = await readFile(
    path.join(
      ROOT,
      "supabase/migrations/20260719000900_profile_comment_likes.sql",
    ),
    "utf8",
  );
  const body = sql.slice(sql.indexOf("function public.delete_profile_comment"));
  assert.match(
    body.slice(0, 900),
    /update public\.profile_comments\s*set body = '', deleted_at = now\(\)/,
    "the delete is no longer a tombstone, so the panel is waiting for the wrong thing",
  );
  assert.ok(
    !/delete from public\.profile_comments/.test(body.slice(0, 900)),
    "the delete removes the row now; the panel's settle condition must follow",
  );
});

test("the panel settles on the tombstone, not on the row vanishing", async () => {
  const source = await readFile(
    path.join(ROOT, "components/social/profile-comments.tsx"),
    "utf8",
  );
  // The bug in one line: a condition that could never come true.
  assert.ok(
    !/!comments\.some\(\(comment\) => comment\.id === awaitingRemovalId\)/.test(
      source,
    ),
    "the panel waits for the deleted comment to disappear, which it never does",
  );
  assert.match(
    source,
    /settled && !settled\.deleted_at/,
    "the panel no longer settles when the comment comes back marked deleted",
  );
});

test("nothing can leave the composer disabled forever", async () => {
  const source = await readFile(
    path.join(ROOT, "components/social/profile-comments.tsx"),
    "utf8",
  );
  // `pending` gates every form on the page, so both waits need a backstop:
  // whatever goes wrong, the page has to become usable again on its own.
  for (const waiting of ["awaitingCommentId", "awaitingRemovalId"]) {
    const fallback = new RegExp(
      `if \\(!${waiting}\\) return;[\\s\\S]{0,400}?setTimeout\\([\\s\\S]{0,300}?setPending\\(null\\)`,
    );
    assert.match(
      source,
      fallback,
      `${waiting} can hang with no timeout, leaving the page unable to comment`,
    );
  }
});
