import assert from "node:assert/strict";
import test from "node:test";
import {
  hasDatabase,
  makeProfile,
  withRollback,
} from "./harness.mts";

test(
  "an admin can ban and unban an account",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const adminId = await makeProfile(tx, {
        role: "ADMIN",
      });
      const targetId = await makeProfile(tx, {
        role: "USER",
      });

      await tx.become("authenticated", adminId);
      assert.equal(
        await tx.attempt(
          `select * from public.moderate_profile($1, 'BAN', $2, 7)`,
          [targetId, "Repeated harassment"],
        ),
        null,
        "the admin ban action failed",
      );

      const [state] = await tx.query<{
        reason: string;
        moderated_by: string;
        temporary: boolean;
      }>(
        `select reason, moderated_by, banned_until is not null as temporary
           from public.profile_moderation_state
          where profile_id = $1`,
        [targetId],
      );
      assert.deepEqual(state, {
        reason: "Repeated harassment",
        moderated_by: adminId,
        temporary: true,
      });

      const [action] = await tx.query<{ action: string }>(
        `select action
           from public.moderation_actions
          where moderator_id = $1 and target_profile_id = $2
          order by created_at desc
          limit 1`,
        [adminId, targetId],
      );
      assert.equal(action.action, "USER_BANNED");

      assert.equal(
        await tx.attempt(
          `select * from public.moderate_profile($1, 'UNBAN', $2)`,
          [targetId, "Appeal accepted"],
        ),
        null,
        "the admin unban action failed",
      );
      const remaining = await tx.query(
        `select 1 from public.profile_moderation_state where profile_id = $1`,
        [targetId],
      );
      assert.equal(remaining.length, 0);
    });
  },
);
