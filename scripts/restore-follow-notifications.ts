import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

/** Restores evidenced follows and an optional operator-approved mutual list. */
async function main() {
  const [username, ...args] = process.argv.slice(2);
  const apply = args.includes("--apply");
  const mutualIndex = args.indexOf("--mutual");
  const peers = mutualIndex < 0 ? [] : args.slice(mutualIndex + 1);
  const flags = mutualIndex < 0 ? args : args.slice(0, mutualIndex);
  if (
    !username ||
    flags.some((flag) => flag !== "--apply") ||
    flags.length > 1 ||
    (mutualIndex >= 0 &&
      (!peers.length || peers.some((peer) => peer.startsWith("--")))) ||
    new Set(peers.map((peer) => peer.toLowerCase())).size !== peers.length
  )
    throw new Error(
      "Usage: tsx scripts/restore-follow-notifications.ts USERNAME [--apply] [--mutual PEER ...]",
    );
  const client = new Client({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '10s'");
    await client.query("set local statement_timeout = '30s'");
    const profile = await client.query<{ id: string; username: string }>(
      "select id, username from public.profiles where lower(username) = lower($1)",
      [username],
    );
    if (profile.rows.length !== 1)
      throw new Error("Target username is not unique or does not exist");
    const owner = profile.rows[0];
    if (apply)
      await client.query(
        "lock table public.follows in share row exclusive mode",
      );
    const evidence = await client.query<{
      actor_id: string;
      recipient_id: string;
      follower: string;
      following: string;
      created_at: Date;
      present: boolean;
    }>(
      `select distinct on (n.actor_id, n.recipient_id) n.actor_id, n.recipient_id,
        a.username as follower, r.username as following, n.created_at,
        exists(select 1 from public.follows f where f.follower_id = n.actor_id
          and f.following_id = n.recipient_id) as present
       from public.notifications n
       join public.profiles a on a.id = n.actor_id
       join public.profiles r on r.id = n.recipient_id
       where n.kind = 'follow' and (n.recipient_id = $1 or n.actor_id = $1)
       and n.actor_id <> n.recipient_id
       order by n.actor_id, n.recipient_id, n.created_at desc`,
      [owner.id],
    );
    const received = evidence.rows.filter(
      (row) => row.recipient_id === owner.id,
    );
    const sent = evidence.rows.filter((row) => row.actor_id === owner.id);
    console.log({
      username: owner.username,
      received: received.map((row) => ({
        follower: row.follower,
        present: row.present,
      })),
      sent: sent.map((row) => ({
        following: row.following,
        present: row.present,
      })),
    });
    const requested = new Map(
      evidence.rows.map((row) => [`${row.actor_id}:${row.recipient_id}`, row]),
    );
    let mutualEdges = 0;
    if (peers.length) {
      const profiles = await client.query<{ id: string; username: string }>(
        "select id, username from public.profiles where lower(username) = any($1::text[])",
        [peers.map((peer) => peer.toLowerCase())],
      );
      if (
        profiles.rows.length !== peers.length ||
        new Set(profiles.rows.map((peer) => peer.username.toLowerCase()))
          .size !== peers.length ||
        profiles.rows.some((peer) => peer.id === owner.id)
      )
        throw new Error(
          "Each mutual peer must resolve uniquely to another account",
        );
      const edges = await client.query<(typeof evidence.rows)[number]>(
        `select a.id as actor_id, r.id as recipient_id,
          a.username as follower, r.username as following,
          transaction_timestamp() as created_at,
          exists(select 1 from public.follows f where f.follower_id = a.id
            and f.following_id = r.id) as present
         from unnest($1::uuid[], $2::uuid[]) as e(actor_id, recipient_id)
         join public.profiles a on a.id = e.actor_id
         join public.profiles r on r.id = e.recipient_id`,
        [
          profiles.rows.flatMap((peer) => [owner.id, peer.id]),
          profiles.rows.flatMap((peer) => [peer.id, owner.id]),
        ],
      );
      mutualEdges = edges.rows.length;
      for (const row of edges.rows) {
        const key = `${row.actor_id}:${row.recipient_id}`;
        if (!requested.has(key)) requested.set(key, row);
      }
      console.log({
        mutualPeers: profiles.rows.map((peer) => peer.username).sort(),
        mutualEdges,
      });
    }
    const rows = [...requested.values()];
    const missing = rows.filter((row) => !row.present);
    if (!apply) {
      console.log({
        mode: "preview",
        evidenced: evidence.rows.length,
        requested: rows.length,
        missing: missing.length,
      });
      await client.query("rollback");
      return;
    }
    let inserted = 0;
    if (missing.length) {
      const triggers = await client.query<{
        tgname: string;
        tgenabled: string;
        function_name: string;
      }>(
        `select t.tgname, t.tgenabled, p.proname as function_name from pg_trigger t
         join pg_proc p on p.oid = t.tgfoid
         where t.tgrelid = 'public.follows'::regclass and not t.tgisinternal`,
      );
      const allowed = new Map([
        ["follows_notification_activity", "notify_follow_activity"],
        ["rate_limit_follows", "rate_limit_follow"],
        ["require_mfa_for_mutation", "require_mfa_for_mutation"],
      ]);
      if (
        !triggers.rows.some(
          (t) =>
            t.tgname === "follows_notification_activity" && t.tgenabled === "O",
        ) ||
        triggers.rows.some((t) => allowed.get(t.tgname) !== t.function_name)
      )
        throw new Error(
          "Unexpected follow trigger configuration; review before applying",
        );
      const countInbox = async () =>
        (
          await client.query<{ count: string }>(
            "select count(*) from public.notifications where kind = 'follow' and (actor_id = $1 or recipient_id = $1)",
            [owner.id],
          )
        ).rows[0].count;
      const before = await countInbox();
      // The lock prevents concurrent follows until commit. Only the inbox trigger
      // is suspended; foreign keys and the account safeguards remain active.
      // Both trigger changes and inserts roll back atomically on failure.
      await client.query(
        "alter table public.follows disable trigger follows_notification_activity",
      );
      const result = await client.query(
        `insert into public.follows(follower_id, following_id, created_at)
         select * from unnest($1::uuid[], $2::uuid[], $3::timestamptz[])
         on conflict do nothing returning follower_id`,
        [
          missing.map((row) => row.actor_id),
          missing.map((row) => row.recipient_id),
          missing.map((row) => row.created_at),
        ],
      );
      inserted = result.rowCount ?? 0;
      await client.query(
        "alter table public.follows enable trigger follows_notification_activity",
      );
      if (inserted !== missing.length || (await countInbox()) !== before)
        throw new Error("Silent restoration verification failed");
    }
    const verified = await client.query<{ count: string }>(
      `select count(*) from unnest($1::uuid[], $2::uuid[]) as e(actor_id, recipient_id)
       join public.follows f on f.follower_id = e.actor_id and f.following_id = e.recipient_id`,
      [rows.map((row) => row.actor_id), rows.map((row) => row.recipient_id)],
    );
    if (Number(verified.rows[0].count) !== rows.length)
      throw new Error("Requested follow verification failed");
    await client.query("commit");
    console.log({
      mode: "applied",
      evidenced: evidence.rows.length,
      mutualEdges,
      verified: rows.length,
      inserted,
      newNotifications: 0,
    });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Restoration failed");
  process.exitCode = 1;
});
