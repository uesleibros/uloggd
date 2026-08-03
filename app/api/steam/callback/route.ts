import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLocale } from "@/app/[lang]/dictionaries";
import { STEAM_STATE_COOKIE, verifySteamCallback } from "@/lib/steam-openid";
import { getSteamPlayer } from "@/lib/steam";

export const runtime = "nodejs";

/**
 * Where Steam sends people back after they sign in.
 *
 * Nothing here has to be registered anywhere: Steam's OpenID accepts any
 * return address under the realm it was given, which is why the signature
 * check below is the whole of the security rather than a formality.
 */
export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(STEAM_STATE_COOKIE)?.value ?? "";
  const separator = cookie.indexOf(":");
  const nonce = separator === -1 ? "" : cookie.slice(0, separator);
  const cookieLang = separator === -1 ? "" : cookie.slice(separator + 1);
  const lang = hasLocale(cookieLang) ? cookieLang : "pt-BR";
  const back = new URL(
    `/${lang}/settings?tab=connections`,
    request.nextUrl.origin,
  );

  const finish = (status: string) => {
    back.searchParams.set("steam", status);
    const response = NextResponse.redirect(back);
    response.cookies.delete(STEAM_STATE_COOKIE);
    return response;
  };

  // Steam sends this when somebody backs out of the sign-in page.
  if (request.nextUrl.searchParams.get("openid.mode") === "cancel")
    return finish("cancelled");
  if (!nonce) return finish("failed");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return finish("failed");

  const steamId = await verifySteamCallback(
    request.nextUrl.searchParams,
    nonce,
  );
  if (!steamId) return finish("failed");

  // The display name is a convenience, not a requirement: it needs an API key
  // the deployment may not have, and a connection that refused to complete
  // over a missing nickname would be a worse trade than a numeric id on
  // screen until the key arrives.
  const player = await getSteamPlayer(steamId);

  try {
    const { error } = await createAdminClient().rpc("connect_steam", {
      target: user.id,
      steam_id: steamId,
      persona: player?.persona ?? null,
    });
    if (error) return finish(error.code === "23505" ? "taken" : "failed");
  } catch {
    return finish("failed");
  }

  return finish("connected");
}
