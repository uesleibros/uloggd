import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * Turning push on, and keeping other people out of it.
 *
 * The first version of this table granted INSERT and DELETE but not UPDATE, so
 * the upsert the client performs failed for everyone and the settings card only
 * said it could not turn notifications on right now. Nothing in TypeScript, the
 * linter or the build could have caught it: the privilege exists only in the
 * database, and the failure only at runtime.
 *
 * `on conflict do update` also needs SELECT on the columns it writes, which was
 * the second half of the same bug and is the sort of thing worth pinning
 * because it is not obvious from reading either the policy or the grant.
 *
 * A push endpoint is a capability: whoever holds one can send to that device.
 * That is why the isolation checks measure the row afterwards rather than
 * trusting an error code, since row-level security refuses by matching nothing
 * rather than by raising.
 */
const ENDPOINT = "https://push.test.invalid/subscription-under-test";

test(
  "a browser can subscribe and re-subscribe without duplicating",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);

      // `profile_id` is in the update list on purpose. PostgREST builds the
      // statement from the payload it receives, and the client sends that key
      // because the insert half needs it, so the update half writes it too.
      // The first version of this test left it out, which is exactly why it
      // passed while turning push on kept failing for everyone.
      const subscribe = (label: string) =>
        tx.attempt(
          `insert into public.push_subscriptions
             (profile_id, endpoint, p256dh, auth, device_label)
           values ($1, $2, 'key', 'auth', $3)
           on conflict (endpoint) do update
             set profile_id = excluded.profile_id,
                 p256dh = excluded.p256dh,
                 auth = excluded.auth,
                 device_label = excluded.device_label`,
          [ordinary.id, ENDPOINT, label],
        );

      assert.equal(
        await subscribe("Android · Chrome"),
        null,
        "subscribing failed, so nobody can turn push on",
      );
      // Re-subscribing returns the same endpoint from the push service, which
      // is exactly the path that was broken.
      assert.equal(
        await subscribe("Android · Chrome v2"),
        null,
        "re-subscribing failed, so push breaks after a browser refreshes it",
      );

      const rows = await tx.query<{ device_label: string }>(
        `select device_label from public.push_subscriptions where endpoint = $1`,
        [ENDPOINT],
      );
      assert.equal(rows.length, 1, "re-subscribing created a duplicate device");
      assert.equal(
        rows[0].device_label,
        "Android · Chrome v2",
        "the upsert did not refresh the row",
      );

      assert.equal(
        await tx.attempt(
          `delete from public.push_subscriptions where endpoint = $1`,
          [ENDPOINT],
        ),
        null,
        "the owner cannot remove their own device",
      );
    });
  },
);

test(
  "a subscription is invisible and unwritable to everyone else",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary, other } = await subjects(tx);
      assert.notEqual(ordinary.id, other.id, "need two distinct accounts");

      await tx.query(
        `insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth)
         values ($1, $2, 'ORIGINAL', 'auth')`,
        [ordinary.id, ENDPOINT],
      );

      await tx.become("authenticated", other.id);
      const visible = await tx.query(
        `select id from public.push_subscriptions where endpoint = $1`,
        [ENDPOINT],
      );
      assert.equal(visible.length, 0, "another account can read the endpoint");

      // Refused by matching no rows rather than by raising, so the row itself
      // is what has to be checked. An earlier version of this test read the
      // error code, saw none, and reported a hole that was not there.
      await tx.attempt(
        `update public.push_subscriptions set p256dh = 'STOLEN' where endpoint = $1`,
        [ENDPOINT],
      );
      await tx.attempt(
        `insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth)
         values ($1, $2, 'STOLEN', 'auth')
         on conflict (endpoint) do update
           set profile_id = excluded.profile_id, p256dh = excluded.p256dh`,
        [other.id, ENDPOINT],
      );
      await tx.query("reset role");

      const [row] = await tx.query<{ p256dh: string; profile_id: string }>(
        `select p256dh, profile_id from public.push_subscriptions where endpoint = $1`,
        [ENDPOINT],
      );
      assert.equal(row.p256dh, "ORIGINAL", "another account rewrote the keys");
      assert.equal(
        row.profile_id,
        ordinary.id,
        "another account reassigned the device to themselves",
      );
    });
  },
);

test(
  "anonymous callers cannot touch subscriptions at all",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("anon");
      assert.ok(
        await tx.attempt(`select * from public.push_subscriptions limit 1`),
        "anonymous callers can read push endpoints",
      );
      assert.ok(
        await tx.attempt(
          `insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth)
           values ($1, $2, 'k', 'a')`,
          [ordinary.id, ENDPOINT],
        ),
        "anonymous callers can register a device for someone else",
      );
    });
  },
);
