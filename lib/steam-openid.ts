import "server-only";
import { SITE_URL } from "@/lib/seo";
import { logIntegrationFailure, logIntegrationStatus } from "@/lib/server-log";

/**
 * Steam's sign-in, which is OpenID 2.0 rather than OAuth 2.
 *
 * Older and stranger than the Twitch flow, and worth stating plainly because
 * the shape is unusual: there is no client secret, no token, and no state
 * parameter. Steam signs the parameters it sends back, and the only way to
 * know they are genuine is to hand the whole set straight back to Steam and
 * ask "did you sign this?". Verifying the signature locally is not possible;
 * the association secret belongs to Steam.
 *
 * Since there is no state parameter, the anti-forgery nonce rides in
 * `return_to`, which Steam signs and echoes. Checking that the echoed value
 * matches the cookie is what ties the callback to the browser that started it.
 */

const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const OPENID_NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = `${OPENID_NS}/identifier_select`;

export const STEAM_STATE_COOKIE = "steam_openid_nonce";

/** The realm has to be a prefix of `return_to`, so both come from one origin. */
export function steamOrigin(): string {
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.NEXT_PUBLIC_SITE_URL
  )
    return "http://localhost:3000";
  return SITE_URL;
}

export function steamReturnTo(nonce: string): string {
  return `${steamOrigin()}/api/steam/callback?n=${encodeURIComponent(nonce)}`;
}

/** Where to send somebody to prove they own a Steam account. */
export function steamAuthorizeUrl(nonce: string): string {
  const params = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": steamReturnTo(nonce),
    "openid.realm": steamOrigin(),
    // Steam is the one that decides which account this is; the site asks for
    // "whoever is signed in" rather than naming anybody.
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID}?${params}`;
}

/**
 * Asks Steam whether it really signed these parameters, and for whom.
 *
 * Returns the 64-bit id only when Steam answers `is_valid:true`. Everything
 * else is a refusal: a forged callback and a broken one look identical from
 * here, and both have to end with nothing written.
 */
export async function verifySteamCallback(
  params: URLSearchParams,
  expectedNonce: string,
): Promise<string | null> {
  // The signed `return_to` is the only thing tying this response to the
  // request that started it. Compared before anything else, and compared
  // against the value the cookie says to expect rather than the one in the
  // URL, which an attacker controls.
  if (params.get("openid.return_to") !== steamReturnTo(expectedNonce))
    return null;
  if (params.get("openid.mode") !== "id_res") return null;

  const claimed = params.get("openid.claimed_id") ?? "";
  const match = /^https:\/\/steamcommunity\.com\/openid\/id\/([0-9]{17})$/.exec(
    claimed,
  );
  if (!match) return null;

  // Every parameter goes back untouched except the mode, which becomes the
  // question. Dropping or reordering any of them changes what was signed and
  // makes a genuine response look forged.
  const check = new URLSearchParams(params);
  check.set("openid.mode", "check_authentication");

  try {
    const response = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: check,
      cache: "no-store",
    });
    if (!response.ok) {
      logIntegrationStatus("steam/openid-verify", response.status);
      return null;
    }
    const body = await response.text();
    // The response is a plain key:value document, not JSON. A substring test
    // would also match `is_valid:false` inside other text, so the line is
    // matched whole.
    const valid = body
      .split("\n")
      .some((line) => line.trim() === "is_valid:true");
    return valid ? match[1] : null;
  } catch (error) {
    logIntegrationFailure("steam/openid-verify", error);
    return null;
  }
}
