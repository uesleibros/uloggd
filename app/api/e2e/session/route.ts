import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Turns a pair of tokens into session cookies, for the end-to-end suite only.
 *
 * The signed-in specs cannot reach a session any other way. The login form
 * requires a Turnstile token, and the workflow has no Turnstile key, so the
 * button never submits; there is no captcha to solve, only a field that
 * renders as unconfigured.
 *
 * This grants nothing. It takes an access token the caller already holds and
 * writes it where the browser keeps one: anybody able to call this could
 * already act as that user by sending the token directly. What it buys is the
 * app's own cookie handling, so the specs exercise the same session plumbing
 * production uses rather than a guess at its cookie format.
 *
 * Gated on the suite's own flag, and answering 404 without it, so the route
 * does not exist in a real deployment.
 */
export async function POST(request: NextRequest) {
  if (process.env.ULOGGD_E2E !== "1")
    return new Response(null, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const { accessToken, refreshToken } = (body ?? {}) as {
    accessToken?: string;
    refreshToken?: string;
  };
  if (!accessToken || !refreshToken) return new Response(null, { status: 400 });

  const supabase = await createClient();
  // `setSession` is what writes the cookies, through the same adapter every
  // other server call uses.
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) return new Response(error.message, { status: 401 });
  return new Response(null, { status: 204 });
}
