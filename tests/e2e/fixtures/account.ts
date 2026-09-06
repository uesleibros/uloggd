import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

/**
 * A throwaway account for the signed-in specs, and the rope to pull it back.
 *
 * Every one of these runs against the real project, because that is the only
 * database the suite has. So the rule is that a spec touches nothing it did
 * not create: the account is made at the start, everything it writes hangs off
 * its own id, and `destroy` removes the account, which cascades the rest away.
 *
 * The name carries the date and a random suffix rather than being fixed, so a
 * run that dies before cleanup cannot collide with the next one, and anything
 * left behind is obvious in a listing.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Whether signed-in specs can run at all here. */
export const canSignIn = Boolean(url && serviceKey && publishableKey);

export type TestAccount = {
  id: string;
  username: string;
  email: string;
};

function admin() {
  return createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Creates an account and returns a live session for it.
 *
 * The session comes from a magic link the service role generates and then
 * redeems, because the sign-in form is unreachable without a Turnstile key
 * and the workflow has none. The token is real; only the way it was obtained
 * is unusual.
 */
export async function createAccount(label: string): Promise<TestAccount> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const username = `e2e${label}${suffix}`.slice(0, 24).toLowerCase();
  const email = `${username}@uloggd-e2e.test`;
  const client = admin();

  const { data: created, error: createError } =
    await client.auth.admin.createUser({
      email,
      password: `e2e-${suffix}-pw`,
      email_confirm: true,
    });
  if (createError || !created.user)
    throw new Error(
      `could not create the test account: ${createError?.message}`,
    );

  // A profile row, a username and a birth date: the sign-up trigger makes the
  // row, and the proxy treats an account missing either field as
  // half-registered and redirects it to onboarding from every page. Without
  // the date, a signed-in spec never reaches the page it asked for.
  //
  // The date cannot be set on its own: the trigger that makes it immutable
  // also insists the assurance record arrives with it, in the same statement.
  const { error: profileError } = await client
    .from("profiles")
    .update({
      username,
      display_name: `E2E ${label}`,
      birth_date: "1995-06-15",
      age_assurance_method: "self_declared",
      age_assured_at: new Date().toISOString(),
    })
    .eq("id", created.user.id);
  if (profileError)
    throw new Error(`could not name the test account: ${profileError.message}`);

  return { id: created.user.id, username, email };
}

/**
 * Runs one statement as the account, without asking the auth service.
 *
 * `create_api_key` reads `auth.uid()`, so the fixture used to mint a real
 * session for every account just to call it, and fifty of those in a run is
 * more than the auth service will hand out. This is the same impersonation the
 * API itself performs in lib/api/owner.ts: become `authenticated`, set the
 * claims, and the definer function sees the owner it expects.
 */
async function asAccount<T>(
  account: TestAccount,
  run: (client: Client) => Promise<T>,
) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: account.id, role: "authenticated" }),
    ]);
    const answer = await run(client);
    await client.query("commit");
    return answer;
  } catch (reason) {
    await client.query("rollback").catch(() => {});
    throw reason;
  } finally {
    await client.end();
  }
}

/**
 * A live session for an account, minted on demand.
 *
 * This is the rate-limited call, not creating the account, and most specs
 * never make it: they hold an API key and talk to the routes directly. Doing
 * it here rather than in `createAccount` is the difference between the suite
 * asking the auth service fifty times a run and asking it five.
 *
 * Waiting and asking again is the whole remedy for the ceiling; failing here
 * would look like a broken sign-in rather than a busy one.
 */
const sessions = new Map<string, { access_token: string; refresh_token: string }>();

async function mintSession(account: TestAccount) {
  const held = sessions.get(account.id);
  if (held) return held;
  const client = admin();
  const { data: link, error: linkError } = await client.auth.admin.generateLink(
    { type: "magiclink", email: account.email },
  );
  const hashedToken = link?.properties?.hashed_token;
  if (linkError || !hashedToken)
    throw new Error(`could not mint a session: ${linkError?.message}`);

  const anon = createClient(url!, publishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0)
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    const { data, error: otpError } = await anon.auth.verifyOtp({
      type: "email",
      token_hash: hashedToken,
    });
    if (data.session) {
      sessions.set(account.id, data.session);
      return data.session;
    }
    if (!/rate limit/i.test(otpError?.message ?? ""))
      throw new Error(`could not redeem the session: ${otpError?.message}`);
  }
  throw new Error("could not redeem the session: rate limited five times");
}

/** Hands the session to the browser, through the app's own cookie handling. */
export async function signIn(context: BrowserContext, account: TestAccount) {
  const session = await mintSession(account);
  const response = await context.request.post("/api/e2e/session", {
    data: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    },
  });
  if (!response.ok())
    throw new Error(
      `the session route answered ${response.status()}: ${await response.text()}`,
    );
}

/**
 * Removes the account and everything it wrote.
 *
 * Deleting the auth user cascades through `profiles` and every table keyed to
 * it, which is why the specs create their own rather than sharing one: cleanup
 * is a single call that cannot reach anybody else's rows.
 */
export async function destroyAccount(account: TestAccount) {
  await admin().auth.admin.deleteUser(account.id);
}

/**
 * Gives a throwaway account a library made of catalogue fixtures.
 *
 * The ids are the ones `lib/igdb-e2e` knows, which matters twice: the shelves
 * cannot draw a game the stubbed catalogue has never heard of, and no real
 * account owns a game numbered nine hundred thousand, so a test account can
 * never turn up as a suggestion on somebody's real home page.
 *
 * `updated_at` is set explicitly rather than left to the default, because the
 * one thing the play-next shelf says on its own is how long something has sat
 * untouched, and a row inserted a second ago has sat for no time at all.
 */
export async function giveLibrary(
  account: TestAccount,
  entries: Array<{
    /** 1 to 61; becomes igdb id 900000 + n and slug `e2e-game-n`. */
    game: number;
    status: "PLAYING" | "BACKLOG" | "COMPLETED";
    /** Days ago the row last moved. Default: today. */
    daysAgo?: number;
  }>,
) {
  const client = admin();
  const rows = entries.map((entry) => ({
    profile_id: account.id,
    igdb_id: 900_000 + entry.game,
    game_slug: `e2e-game-${entry.game}`,
    status: entry.status,
    playing: entry.status === "PLAYING",
    backlog: entry.status === "BACKLOG",
    updated_at: new Date(
      Date.now() - (entry.daysAgo ?? 0) * 24 * 60 * 60 * 1000,
    ).toISOString(),
  }));
  const { error } = await client.from("user_games").insert(rows);
  if (error) throw new Error(`could not build the library: ${error.message}`);
}

/**
 * Issues an API key for a throwaway account and returns its token.
 *
 * Made as the account rather than by the service role, because that is the
 * only way a key is ever made: `create_api_key` reads `auth.uid()`, and a
 * service-role call has none. Nothing cleans it up on purpose: the key hangs
 * off the profile, so deleting the account takes it.
 */
export async function issueApiKey(account: TestAccount, scopes: string[]) {
  const row = await asAccount(account, async (client) => {
    const { rows } = await client.query<{ id: string; token: string }>(
      "select id, token from public.create_api_key(key_name => $1, key_scopes => $2::text[])",
      [`e2e ${Date.now().toString(36)}`, scopes],
    );
    return rows[0];
  });
  if (!row) throw new Error("could not issue a key: no row");
  return row;
}

/** Revokes a key, so a spec can prove a revoked key stops working. */
export async function revokeApiKey(account: TestAccount, keyId: string) {
  await asAccount(account, (client) =>
    client.query("select public.revoke_api_key(key_id => $1)", [keyId]),
  );
}

/**
 * Makes a throwaway account private.
 *
 * Following one of these is a request rather than a follow, and the database
 * refuses a direct insert into `follows` for exactly that reason, so a spec
 * that never has a private account to point at cannot tell the two apart.
 */
export async function makePrivate(account: TestAccount) {
  const { error } = await admin()
    .from("profiles")
    .update({ is_private: true })
    .eq("id", account.id);
  if (error) throw new Error(`could not make it private: ${error.message}`);
}

/**
 * Gives a throwaway account staff rights.
 *
 * `role` is revoked from `authenticated`, so nothing signed in can grant it
 * and the console's own gate reads it through a definer function. The service
 * role goes around both, which is the only way a spec can ever stand where a
 * moderator stands.
 */
export async function makeStaff(
  account: TestAccount,
  role: "MODERATOR" | "ADMIN" = "MODERATOR",
) {
  const { error } = await admin()
    .from("profiles")
    .update({ role })
    .eq("id", account.id);
  if (error) throw new Error(`could not make it staff: ${error.message}`);
}

/**
 * Files a report against an account, as another account.
 *
 * Inserted rather than posted, because the point is to put a specific row in
 * front of the console, not to exercise the reporting form. The report is
 * keyed to the reporter, so deleting either account takes it.
 */
export async function fileReport(
  reporter: TestAccount,
  target: TestAccount,
  fields: {
    reason?: string;
    details?: string;
    status?: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
    contentType?: string;
    contentId?: string;
  } = {},
) {
  const { data, error } = await admin()
    .from("reports")
    .insert({
      reporter_id: reporter.id,
      target_profile_id: target.id,
      reason: fields.reason ?? "HARASSMENT",
      details: fields.details ?? null,
      status: fields.status ?? "OPEN",
      content_type: fields.contentType ?? "PROFILE",
      content_id: fields.contentId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`could not file a report: ${error.message}`);
  return data.id as string;
}
