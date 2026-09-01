import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./server";
import { E2E_ENABLED } from "@/lib/e2e";

export type AuthUser = { id: string; email: string | null };

/** Whether this request carries anything Supabase would call a session. */
async function hasSessionCookie() {
  const store = await cookies();
  return store.getAll().some(({ name }) => name.startsWith("sb-"));
}

export const getSupabase = cache(createClient);

// Verifies the JWT locally via getClaims (no Auth server round-trip on
// projects with asymmetric signing keys) and dedupes across layout and
// pages within a single request.
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  // The end-to-end suite runs signed out for almost everything, and this
  // short-circuit is why: building the client and verifying a token nobody
  // sent is work with a known answer.
  //
  // Conditioned on the cookie rather than on the flag alone, so a spec that
  // signs in through the real form gets a real session. Behaviour for an
  // anonymous request is identical either way, since `getClaims` finds
  // nothing without one.
  if (E2E_ENABLED && !(await hasSessionCookie()))
    return null;
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

export const getNavigationAccount = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await getSupabase();
  // `role` is revoked from `authenticated`, so it cannot ride along in this
  // select: naming it fails the whole request and the header loses the avatar
  // and username with it. It comes from the definer function scoped to the
  // caller instead.
  const [{ data: profile }, { data: role }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,avatar_url,verified")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("own_account_role"),
  ]);
  return {
    // Carried so the header can show the same level badge the rest of the site
    // does; the profile row is keyed by it and never selects it back.
    id: user.id,
    email: user.email ?? "",
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    verified: profile?.verified ?? false,
    role: role ?? "USER",
  };
});
