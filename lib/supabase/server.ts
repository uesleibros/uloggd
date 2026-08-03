import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { AUTH_COOKIE_OPTIONS } from "./cookie-options";

export async function createClient() {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);
  // Forwarded so the auth server records who actually signed in. Sign-in
  // finishes on the server, and without these GoTrue writes the runtime's own
  // user agent and address: the session list showed "node" from an AWS
  // address for every login that went through a callback, which is useless for
  // the one thing that list is for.
  const forwarded: Record<string, string> = {};
  const userAgent = requestHeaders.get("user-agent");
  const clientIp =
    requestHeaders.get("x-forwarded-for") ??
    requestHeaders.get("x-real-ip") ??
    null;
  if (userAgent) forwarded["user-agent"] = userAgent;
  if (clientIp) forwarded["x-forwarded-for"] = clientIp;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: forwarded },
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies; the auth proxy will refresh them.
          }
        },
      },
    },
  );
}
