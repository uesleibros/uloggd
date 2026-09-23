import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * What moderation tells the person it acted on.
 *
 * Every decision here ends in somebody's inbox, and the inbox accepts a kind
 * only if the check constraint lists it. That constraint is restated whole by
 * every migration that touches it, which is how `moderation_screenshot_removed`
 * fell out of the list: taking a screenshot down then failed on the
 * notification insert and rolled the removal back with it. These tests are
 * about the words reaching the account, not about the action succeeding in
 * isolation.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";

test("a warning is recorded, logged and delivered", { skip }, async () => {
  await withRollback(async (tx) => {
    const moderatorId = await makeProfile(tx, { role: "MODERATOR" });
    const targetId = await makeProfile(tx, { role: "USER" });

    await tx.become("authenticated", moderatorId);
    assert.equal(
      await tx.attempt(
        `select * from public.moderate_profile($1, 'WARN', $2)`,
        [targetId, "Spoilers without a tag, twice"],
      ),
      null,
      "the warning was refused",
    );

    const [action] = await tx.query<{ action: string; reason: string }>(
      `select action, reason from public.moderation_actions
        where moderator_id = $1 and target_profile_id = $2`,
      [moderatorId, targetId],
    );
    assert.equal(action.action, "USER_WARNED");
    assert.equal(action.reason, "Spoilers without a tag, twice");

    // The person can read their own notice and their own record.
    await tx.become("authenticated", targetId);
    const [notice] = await tx.query<{ kind: string; target_title: string }>(
      `select kind, target_title from public.notifications
        where recipient_id = $1`,
      [targetId],
    );
    assert.equal(notice.kind, "moderation_warning");
    assert.equal(notice.target_title, "Spoilers without a tag, twice");

    const [infraction] = await tx.query<{ reason: string; details: string }>(
      `select reason, details from public.profile_infractions
        where profile_id = $1`,
      [targetId],
    );
    assert.equal(infraction.reason, "Aviso");
    assert.equal(infraction.details, "Spoilers without a tag, twice");

    // A warning is nothing but its words, so it cannot be sent without them.
    await tx.become("authenticated", moderatorId);
    assert.equal(
      await tx.attempt(`select * from public.moderate_profile($1, 'WARN')`, [
        targetId,
      ]),
      "22023",
      "a warning with no reason was accepted",
    );
  });
});

test("a suspension and a reinstatement both say so", { skip }, async () => {
  await withRollback(async (tx) => {
    const adminId = await makeProfile(tx, { role: "ADMIN" });
    const targetId = await makeProfile(tx, { role: "USER" });

    await tx.become("authenticated", adminId);
    assert.equal(
      await tx.attempt(
        `select * from public.moderate_profile($1, 'BAN', $2, 7)`,
        [targetId, "Harassment"],
      ),
      null,
    );
    assert.equal(
      await tx.attempt(
        `select * from public.moderate_profile($1, 'UNBAN', $2)`,
        [targetId, "Appeal accepted"],
      ),
      null,
    );

    await tx.become("authenticated", targetId);
    // Ordered by kind rather than by time: both were written inside one
    // transaction, where now() is the same instant for every statement.
    const notices = await tx.query<{ kind: string; target_title: string }>(
      `select kind, target_title from public.notifications
        where recipient_id = $1 order by kind`,
      [targetId],
    );
    assert.deepEqual(notices, [
      { kind: "moderation_reinstated", target_title: "Appeal accepted" },
      { kind: "moderation_suspended", target_title: "Harassment" },
    ]);
  });
});

test("the inbox accepts every notice moderation sends", { skip }, async () => {
  await withRollback(async (tx) => {
    const moderatorId = await makeProfile(tx, { role: "MODERATOR" });
    const targetId = await makeProfile(tx, { role: "USER" });
    for (const kind of [
      "moderation_comment_removed",
      "moderation_screenshot_removed",
      "moderation_warning",
      "moderation_suspended",
      "moderation_reinstated",
    ]) {
      assert.equal(
        await tx.attempt(
          `insert into public.notifications(recipient_id, actor_id, kind, target_id)
           values ($1, $2, $3, gen_random_uuid())`,
          [targetId, moderatorId, kind],
        ),
        null,
        `the inbox refused ${kind}`,
      );
      const [enabled] = await tx.query<{ on: boolean }>(
        `select public.notification_preference_enabled($1, $2) as on`,
        [targetId, kind],
      );
      assert.equal(enabled.on, true, `${kind} has no delivery preference`);
    }
  });
});

test("an account's own content is staff-only", { skip }, async () => {
  await withRollback(async (tx) => {
    const moderatorId = await makeProfile(tx, { role: "MODERATOR" });
    const authorId = await makeProfile(tx, { role: "USER" });
    const strangerId = await makeProfile(tx, { role: "USER" });
    const [comment] = await tx.query<{ id: string }>(
      `insert into public.profile_comments(profile_id, author_id, body)
       values ($1, $2, 'something worth taking down') returning id`,
      [strangerId, authorId],
    );

    await tx.become("authenticated", moderatorId);
    const found = await tx.query<{ kind: string; id: string; body: string }>(
      `select kind, id, body from public.moderation_account_content($1)`,
      [authorId],
    );
    assert.deepEqual(found, [
      {
        kind: "PROFILE_COMMENT",
        id: comment.id,
        body: "something worth taking down",
      },
    ]);

    // Anybody else gets an empty answer rather than a refusal, which is how
    // the console's account search behaves: nothing, and no confirmation that
    // there was something to have.
    await tx.become("authenticated", strangerId);
    assert.deepEqual(
      await tx.query(`select 1 from public.moderation_account_content($1)`, [
        authorId,
      ]),
      [],
    );
  });
});

test("a comment comes down without a report behind it", { skip }, async () => {
  await withRollback(async (tx) => {
    const moderatorId = await makeProfile(tx, { role: "MODERATOR" });
    const authorId = await makeProfile(tx, { role: "USER" });
    const wallId = await makeProfile(tx, { role: "USER" });
    const [comment] = await tx.query<{ id: string }>(
      `insert into public.profile_comments(profile_id, author_id, body)
       values ($1, $2, 'nobody reported this one') returning id`,
      [wallId, authorId],
    );

    await tx.become("authenticated", moderatorId);
    assert.equal(
      await tx.attempt(
        `select public.moderate_profile_comment($1, $2, null)`,
        [comment.id, "Off the rules"],
      ),
      null,
      "the removal needed a report",
    );

    await tx.become("authenticated", authorId);
    const [gone] = await tx.query<{ removed: boolean }>(
      `select deleted_at is not null as removed
         from public.profile_comments where id = $1`,
      [comment.id],
    );
    assert.equal(gone.removed, true);
    const [notice] = await tx.query<{ kind: string }>(
      `select kind from public.notifications where recipient_id = $1`,
      [authorId],
    );
    assert.equal(notice.kind, "moderation_comment_removed");
  });
});
