import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
const run = promisify(execFile);

test(
  "inbox restoration preserves notification state and timestamps and is idempotent",
  {
    skip: !process.env.DIRECT_URL || !process.env.SUPABASE_SECRET_KEY,
  },
  async () => {
    const { createAccount, destroyAccount } =
      await import("../e2e/fixtures/account.ts");
    const owner = await createAccount("restoreowner");
    let peer: Awaited<ReturnType<typeof createAccount>> | null = null;
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    let connected = false;
    try {
      peer = await createAccount("restorepeer");
      await client.connect();
      connected = true;
      await client.query(
        "insert into public.follows(follower_id, following_id) values ($1, $2), ($2, $1)",
        [owner.id, peer.id],
      );
      await client.query(
        "update public.notifications set read_at = now() where kind = 'follow' and (actor_id = $1 or recipient_id = $1)",
        [owner.id],
      );
      const notifications = async () =>
        (
          await client.query(
            "select * from public.notifications where kind = 'follow' and (actor_id = $1 or recipient_id = $1) order by id",
            [owner.id],
          )
        ).rows;
      const before = await notifications();
      assert.equal(before.length, 2);
      await client.query("begin");
      try {
        await client.query("set local lock_timeout = '10s'");
        await client.query(
          "lock table public.follows in share row exclusive mode",
        );
        await client.query(
          "alter table public.follows disable trigger follows_notification_activity",
        );
        await client.query(
          "delete from public.follows where follower_id = $1 or following_id = $1",
          [owner.id],
        );
        await client.query(
          "alter table public.follows enable trigger follows_notification_activity",
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      for (const inserted of [2, 0]) {
        const result = await run(
          process.execPath,
          [
            "--import",
            "tsx",
            "scripts/restore-follow-notifications.ts",
            owner.username,
            "--apply",
          ],
          { timeout: 30_000 },
        );
        assert.match(result.stdout, new RegExp(`inserted: ${inserted}`));
        assert.match(result.stdout, /newNotifications: 0/);
        assert.deepEqual(await notifications(), before);
        const follows = (
          await client.query(
            "select follower_id, following_id, created_at from public.follows where follower_id = $1 or following_id = $1",
            [owner.id],
          )
        ).rows;
        assert.equal(follows.length, 2);
        for (const edge of follows) {
          const notification = before.find(
            (n) =>
              n.actor_id === edge.follower_id &&
              n.recipient_id === edge.following_id,
          );
          assert.deepEqual(edge.created_at, notification.created_at);
        }
        assert.equal(
          (
            await client.query(
              "select tgenabled from pg_trigger where tgrelid = 'public.follows'::regclass and tgname = 'follows_notification_activity'",
            )
          ).rows[0].tgenabled,
          "O",
        );
      }
      // Ordinary deletion erases the old inbox evidence. The approved mutual
      // list can still restore both directions without producing notifications.
      await client.query(
        "delete from public.follows where follower_id = $1 or following_id = $1",
        [owner.id],
      );
      assert.deepEqual(await notifications(), []);
      for (const inserted of [2, 0]) {
        const result = await run(
          process.execPath,
          [
            "--import",
            "tsx",
            "scripts/restore-follow-notifications.ts",
            owner.username,
            "--apply",
            "--mutual",
            peer.username,
          ],
          { timeout: 30_000 },
        );
        assert.match(result.stdout, new RegExp(`inserted: ${inserted}`));
        assert.match(result.stdout, /verified: 2/);
        assert.match(result.stdout, /newNotifications: 0/);
        assert.deepEqual(await notifications(), []);
      }
    } finally {
      if (connected) await client.end();
      if (peer) await destroyAccount(peer);
      await destroyAccount(owner);
    }
  },
);
