import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { hasLocale } from "@/app/[lang]/dictionaries";
import {
  TWITCH_AUTHORIZE,
  TWITCH_STATE_COOKIE,
  twitchConfigured,
  twitchRedirectUri,
} from "@/lib/twitch-oauth";

export const runtime = "nodejs";

/**
 * Starts the Twitch connect flow.
 *
 * A redirect rather than a form post, because the whole point is that the
 * person leaves the site, tells Twitch who they are, and comes back with
 * Twitch's answer instead of their own.
 */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("lang");
  const lang = hasLocale(requested ?? "") ? requested! : "pt-BR";
  const settings = new URL(
    `/${lang}/settings?tab=connections`,
    request.nextUrl.origin,
  );

  if (!twitchConfigured()) {
    settings.searchParams.set("twitch", "unavailable");
    return NextResponse.redirect(settings);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.redirect(
      new URL(`/${lang}/login`, request.nextUrl.origin),
    );

  // Ties the callback to the browser that started this. Without it, anyone
  // could hand a signed-in person a callback URL carrying their own code and
  // have somebody else's channel written onto that person's profile.
  const state = crypto.randomUUID();
  const authorize = new URL(TWITCH_AUTHORIZE);
  authorize.searchParams.set("client_id", process.env.TWITCH_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", twitchRedirectUri());
  authorize.searchParams.set("response_type", "code");
  // No scopes. Reading who the token belongs to needs none, and asking for
  // more would be collecting what the site never uses.
  authorize.searchParams.set("scope", "");
  authorize.searchParams.set("state", state);
  // Twitch remembers an approval, so a second connect would silently reuse the
  // first account. Forcing the screen is what lets somebody switch channels,
  // and lets them see what they are approving each time.
  authorize.searchParams.set("force_verify", "true");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(TWITCH_STATE_COOKIE, `${state}:${lang}`, {
    ...AUTH_COOKIE_OPTIONS,
    // This one never has to be read by script, unlike the session cookies, so
    // it gets the protection they cannot have.
    httpOnly: true,
    maxAge: 600,
  });
  return response;
}
