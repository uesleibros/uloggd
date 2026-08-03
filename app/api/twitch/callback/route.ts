import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLocale } from "@/app/[lang]/dictionaries";
import { TWITCH_STATE_COOKIE, exchangeTwitchCode } from "@/lib/twitch-oauth";

export const runtime = "nodejs";

/**
 * Where Twitch sends people back after they approve the connection.
 *
 * This is the URL that goes in the Twitch developer console as an OAuth
 * Redirect URL. Twitch matches it exactly, so it has no locale segment and no
 * query string of its own.
 *
 * Everything here refuses rather than guesses. A connection nobody asked for
 * is worse than a connection that failed and said so, because a wrong handle
 * puts somebody else's stream on a profile under this person's name.
 */
export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(TWITCH_STATE_COOKIE)?.value ?? "";
  const [expectedState, cookieLang] = cookie.split(":");
  const lang = hasLocale(cookieLang ?? "") ? cookieLang! : "pt-BR";
  const back = new URL(
    `/${lang}/settings?tab=connections`,
    request.nextUrl.origin,
  );

  const finish = (status: string) => {
    back.searchParams.set("twitch", status);
    const response = NextResponse.redirect(back);
    // Single use, whatever happened. A state left behind is a state that can
    // be replayed.
    response.cookies.delete(TWITCH_STATE_COOKIE);
    return response;
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  // Twitch says so itself when somebody presses Cancel, and that is not a
  // failure worth an error message.
  if (request.nextUrl.searchParams.get("error")) return finish("cancelled");
  if (!code || !state || !expectedState || state !== expectedState)
    return finish("failed");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return finish("failed");

  const account = await exchangeTwitchCode(code);
  if (!account) return finish("failed");

  // The write goes through the service role because `connect_twitch` is
  // revoked from every role a browser can reach. That is what makes the
  // handle a statement by Twitch rather than by whoever typed it.
  try {
    const { error } = await createAdminClient().rpc("connect_twitch", {
      target: user.id,
      handle: account.login,
      channel_id: account.id,
    });
    if (error) return finish(error.code === "23505" ? "taken" : "failed");
  } catch {
    return finish("failed");
  }

  return finish("connected");
}
