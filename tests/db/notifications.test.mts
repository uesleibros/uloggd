import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * Likes and comments have to actually notify their author.
 *
 * `notification_preference_enabled` ends in `else false`, so a kind the
 * constraint accepts but the function does not name is written nowhere and
 * reported nowhere: no error, no log, no failing build. Four kinds were in
 * that state at once, which is why users said "some likes do not notify".
 *
 * A unit test already checks the constraint and the function agree on paper.
 * This one inserts a real like against a real row and reads the notification
 * back, which is the only way to catch a trigger that stopped firing, a
 * mismatched `when` branch, or a policy that blocks the insert.
 */
test(
  "liking content notifies its author",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary, other } = await subjects(tx);
      assert.notEqual(ordinary.id, other.id, "need two distinct accounts");

      // Each entry is [table, content_type, expected notification kind]. Only the
      // surfaces that exist in this database are exercised, so the test reports a
      // broken trigger rather than an empty schema.
      const surfaces: [string, string, string][] = [
        ["reviews", "review", "review_like"],
        ["screenshots", "screenshot", "screenshot_like"],
        ["diary_entries", "diary", "journal_like"],
        ["game_lists", "list", "list_like"],
      ];

      let exercised = 0;
      for (const [table, contentType, kind] of surfaces) {
        const [row] = await tx.query<{ id: string; profile_id: string }>(
          `select id, profile_id from public.${table}
         where profile_id <> $1 limit 1`,
          [other.id],
        );
        if (!row) continue;
        exercised += 1;

        // The liker must not be the author, since nobody is notified of their own
        // like, and that would make this pass for the wrong reason.
        const liker = row.profile_id === ordinary.id ? other.id : ordinary.id;
        await tx.query(
          `delete from public.notifications
         where recipient_id = $1 and actor_id = $2 and kind = $3`,
          [row.profile_id, liker, kind],
        );
        await tx.query(
          `insert into public.content_likes (profile_id, content_type, content_id)
         values ($1, $2, $3)
         on conflict do nothing`,
          [liker, contentType, row.id],
        );

        const delivered = await tx.query(
          `select id from public.notifications
         where recipient_id = $1 and actor_id = $2 and kind = $3`,
          [row.profile_id, liker, kind],
        );
        assert.equal(
          delivered.length,
          1,
          `a ${contentType} like wrote no ${kind} notification, so this like is silent in production`,
        );
      }

      assert.ok(
        exercised > 0,
        "no likeable content exists, so this test proved nothing",
      );
    });
  },
);

test(
  "every accepted notification kind is deliverable",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    // Asks the live function about every kind the live constraint accepts. The
    // unit test parses the same thing out of the migration files; this one
    // catches a database whose function was changed by hand.
    await withRollback(async (tx) => {
      const [constraint] = await tx.query<{ def: string }>(
        `select pg_get_constraintdef(oid) def from pg_constraint
       where conname = 'notifications_kind_check'`,
      );
      assert.ok(constraint, "the kind constraint is gone");
      const kinds = [...constraint.def.matchAll(/'([a-z_]+)'::text/g)].map(
        (match) => match[1],
      );
      assert.ok(kinds.length > 0, "parsed no kinds from the constraint");

      const { ordinary } = await subjects(tx);
      const dropped: string[] = [];
      for (const kind of kinds) {
        const [row] = await tx.query<{ enabled: boolean | null }>(
          `select public.notification_preference_enabled($1, $2) enabled`,
          [ordinary.id, kind],
        );
        // `else false` is indistinguishable from a user who switched the kind
        // off, so the default preferences are what makes this readable: a kind
        // nobody can receive by default is a kind nobody named in the function.
        if (row?.enabled === false) dropped.push(kind);
      }
      assert.deepEqual(
        dropped,
        [],
        `these kinds are disabled by default, which is what a missing branch looks like: ${dropped.join(", ")}`,
      );
    });
  },
);
