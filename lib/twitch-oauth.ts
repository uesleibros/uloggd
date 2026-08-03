import "server-only";
import { SITE_URL } from "@/lib/seo";

/**
 * The pieces both halves of the Twitch connect flow have to agree on.
 *
 * Kept in one place because OAuth fails silently when the two halves disagree:
 * a redirect URI that differs by a trailing slash between the authorize call
 * and the token call is rejected at the very end, after the person has already
 * approved, and the error says nothing useful.
 */

export const TWITCH_AUTHORIZE = "https://id.twitch.tv/oauth2/authorize";
export const TWITCH_TOKEN = "https://id.twitch.tv/oauth2/token";

/** The cookie holding the anti-forgery state between the two halves. */
export const TWITCH_STATE_COOKIE = "twitch_oauth_state";

/**
 * Where Twitch sends people back.
 *
 * Twitch matches this string exactly against what is registered in the
 * developer console, so it is built from the site's own origin rather than
 * from the request: a proxy or a spoofed Host header must not be able to move
 * where an authorization code lands.
 *
 * Localhost is allowed in development only, because that is the one case where
 * the site's origin genuinely is not uloggd.com.
 */
export function twitchRedirectUri(): string {
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.NEXT_PUBLIC_SITE_URL
  )
    return "http://localhost:3000/api/twitch/callback";
  return `${SITE_URL}/api/twitch/callback`;
}

/** Whether the site is configured to talk to Twitch at all. */
export function twitchConfigured(): boolean {
  return Boolean(
    process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET,
  );
}

export type TwitchAccount = { login: string; id: string };

/**
 * Turns an authorization code into the account that approved it.
 *
 * Asks Twitch who the token belongs to rather than trusting anything the
 * browser sent, which is the entire point of routing the link through OAuth:
 * the handle that ends up on the profile is the one Twitch named, and nobody
 * can name somebody else's.
 *
 * No scopes are requested. `/helix/users` without an `id` or `login` returns
 * the account the token was issued for, and that is all this needs; asking for
 * the email or anything else would be collecting what we do not use.
 */
export async function exchangeTwitchCode(
  code: string,
): Promise<TwitchAccount | null> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;

  try {
    const tokenResponse = await fetch(TWITCH_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: id,
        client_secret: secret,
        code,
        grant_type: "authorization_code",
        redirect_uri: twitchRedirectUri(),
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return null;
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) return null;

    const userResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-Id": id,
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    });
    if (!userResponse.ok) return null;
    const payload = (await userResponse.json()) as {
      data?: Array<{ login?: string; id?: string }>;
    };
    const account = payload.data?.[0];
    if (!account?.login || !account.id) return null;

    // The user token is not kept. Everything after this reads public channel
    // data with the site's own app token, so storing a credential that can act
    // as the person would be holding a key nothing turns.
    return { login: account.login, id: account.id };
  } catch {
    return null;
  }
}
