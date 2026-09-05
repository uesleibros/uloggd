import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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
  accessToken: string;
  refreshToken: string;
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

  const { data: link, error: linkError } = await client.auth.admin.generateLink(
    {
      type: "magiclink",
      email,
    },
  );
  const hashedToken = link?.properties?.hashed_token;
  if (linkError || !hashedToken)
    throw new Error(`could not mint a session: ${linkError?.message}`);

  const anon = createClient(url!, publishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // The auth service limits how fast sessions can be minted, and a suite that
  // makes an account per spec walks into that ceiling rather than into a bug.
  // Waiting and asking again is the whole remedy; failing here would look like
  // a broken sign-in.
  let session: Awaited<ReturnType<typeof anon.auth.verifyOtp>>["data"] | null =
    null;
  for (let attempt = 0; attempt < 4 && !session?.session; attempt += 1) {
    if (attempt > 0)
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    const { data, error: otpError } = await anon.auth.verifyOtp({
      type: "email",
      token_hash: hashedToken,
    });
    if (data.session) session = data;
    else if (!/rate limit/i.test(otpError?.message ?? ""))
      throw new Error(`could not redeem the session: ${otpError?.message}`);
  }
  if (!session?.session)
    throw new Error("could not redeem the session: rate limited four times");

  // A profile row, a username and a birth date: the sign-up trigger makes the
  // row, and the proxy treats an account missing either field as
  // half-registered and redirects it to onboarding from every page. Without
  // the date, a signed-in spec never reaches the page it asked for.
  //
  // The date cannot be set on its own — the trigger that makes it immutable
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

  return {
    id: created.user.id,
    username,
    email,
    accessToken: session.session.access_token,
    refreshToken: session.session.refresh_token,
  };
}

/** Hands the session to the browser, through the app's own cookie handling. */
export async function signIn(context: BrowserContext, account: TestAccount) {
  const response = await context.request.post("/api/e2e/session", {
    data: {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
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
 * service-role call has none. Nothing cleans it up on purpose — the key hangs
 * off the profile, so deleting the account takes it.
 */
export async function issueApiKey(account: TestAccount, scopes: string[]) {
  const client = createClient(url!, publishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${account.accessToken}` } },
  });
  const { data, error } = await client.rpc("create_api_key", {
    key_name: `e2e ${Date.now().toString(36)}`,
    key_scopes: scopes,
  });
  const row = (Array.isArray(data) ? data[0] : data) as
    { id: string; token: string } | undefined;
  if (error || !row)
    throw new Error(`could not issue a key: ${error?.message ?? "no row"}`);
  return row;
}

/** Revokes a key, so a spec can prove a revoked key stops working. */
export async function revokeApiKey(account: TestAccount, keyId: string) {
  const client = createClient(url!, publishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${account.accessToken}` } },
  });
  const { error } = await client.rpc("revoke_api_key", { key_id: keyId });
  if (error) throw new Error(`could not revoke the key: ${error.message}`);
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
