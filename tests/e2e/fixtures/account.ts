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
  const { data: session, error: otpError } = await anon.auth.verifyOtp({
    type: "email",
    token_hash: hashedToken,
  });
  if (otpError || !session.session)
    throw new Error(`could not redeem the session: ${otpError?.message}`);

  // A profile row and a username: the sign-up trigger makes the row, and the
  // rest of the site treats an account without a username as half-registered
  // and sends it to onboarding.
  const { error: profileError } = await client
    .from("profiles")
    .update({ username, display_name: `E2E ${label}` })
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
