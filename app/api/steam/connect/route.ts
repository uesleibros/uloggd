import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { hasLocale } from "@/app/[lang]/dictionaries";
import { STEAM_STATE_COOKIE, steamAuthorizeUrl } from "@/lib/steam-openid";

export const runtime = "nodejs";

/** Starts the Steam connect flow. */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("lang");
  const lang = hasLocale(requested ?? "") ? requested! : "pt-BR";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.redirect(
      new URL(`/${lang}/login`, request.nextUrl.origin),
    );

  // OpenID 2.0 has no state parameter, so this rides in `return_to`, which
  // Steam signs and echoes back.
  const nonce = crypto.randomUUID();
  const response = NextResponse.redirect(steamAuthorizeUrl(nonce));
  response.cookies.set(STEAM_STATE_COOKIE, `${nonce}:${lang}`, {
    ...AUTH_COOKIE_OPTIONS,
    httpOnly: true,
    maxAge: 600,
  });
  return response;
}
