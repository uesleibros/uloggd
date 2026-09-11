import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

/**
 * Removes the throwaway accounts the e2e suite left behind.
 *
 * The fixture destroys what it creates, but a run that is interrupted, or one
 * whose serial block aborts, never reaches its own cleanup, and the suite has
 * only the real project to run against. They pile up: 126 of them by the time
 * this was written, against 35 real accounts.
 *
 * The filter is the email domain the fixture uses, `@uloggd-e2e.test`. `.test`
 * is a reserved TLD that cannot be registered or delivered to, so no real
 * account can hold one, which is what makes this safe to run unattended.
 *
 * One dependency has to go first. `moderation_actions.moderator_id` references
 * profiles with RESTRICT rather than CASCADE, so an account that decided a
 * report in the moderation specs cannot be deleted while that record stands.
 * That is what a plain `deleteUser` fails on, and it fails as a bare 500 from
 * the Auth service with no message, which is worth knowing before spending an
 * afternoon on it. Only rows whose moderator is one of these accounts are
 * removed, and only after confirming none of them names a real target or a
 * real reporter.
 *
 *   npm run e2e:clean              what would go
 *   npm run e2e:clean -- --delete  actually remove it
 */

config({ path: ".env.local", quiet: true });

const DOMAIN = "@uloggd-e2e.test";
const E2E = `select id from auth.users where email like '%${DOMAIN}'`;

async function main() {
  const apply = process.argv.includes("--delete");
  const connectionString = process.env.DATABASE_URL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!connectionString || !url || !serviceKey)
    throw new Error(
      "needs DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY",
    );

  const db = new Client({ connectionString });
  await db.connect();

  try {
    const { rows: counted } = await db.query<{ n: number }>(
      `select count(*)::int as n from auth.users where email like '%${DOMAIN}'`,
    );
    console.log(`e2e accounts: ${counted[0].n}`);
    if (!counted[0].n) return;

    // Checked on every run rather than the once it was checked by hand. If a
    // test account ever moderated something real, that record stays and this
    // stops.
    const { rows: reach } = await db.query<{
      real_target: number;
      real_reporter: number;
    }>(`
      select
        count(*) filter (
          where a.target_profile_id is not null
            and a.target_profile_id not in (${E2E})
        )::int as real_target,
        count(*) filter (
          where r.reporter_id is not null and r.reporter_id not in (${E2E})
        )::int as real_reporter
      from public.moderation_actions a
      left join public.reports r on r.id = a.report_id
      where a.moderator_id in (${E2E})
    `);
    if (reach[0].real_target || reach[0].real_reporter)
      throw new Error(
        `refusing: e2e moderation rows reach real content (${reach[0].real_target} targets, ${reach[0].real_reporter} reporters)`,
      );

    const { rows: held } = await db.query<{ n: number }>(`
      select count(*)::int as n from public.moderation_actions
      where moderator_id in (${E2E})
    `);
    console.log(`moderation rows in the way: ${held[0].n}`);

    if (!apply) {
      console.log("\ndry run, nothing removed; pass --delete to remove it");
      return;
    }

    const cleared = await db.query(
      `delete from public.moderation_actions where moderator_id in (${E2E})`,
    );
    console.log(`cleared ${cleared.rowCount} moderation rows`);

    const { rows: targets } = await db.query<{ id: string; email: string }>(
      `select id, email from auth.users where email like '%${DOMAIN}'`,
    );

    // Through the Auth service rather than SQL, so it takes its own sessions,
    // identities and refresh tokens with it. Everything in public cascades off
    // the profile.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let gone = 0;
    const failed: string[] = [];
    for (const user of targets) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) failed.push(`${user.email}: ${error.message}`);
      else gone++;
    }

    console.log(`removed ${gone} of ${targets.length}`);
    for (const line of failed.slice(0, 10)) console.log(`  failed: ${line}`);
    if (failed.length > 10)
      console.log(`  ... and ${failed.length - 10} more failures`);
  } finally {
    await db.end();
  }
}

main().catch((reason) => {
  console.error(reason instanceof Error ? reason.message : reason);
  process.exit(1);
});
