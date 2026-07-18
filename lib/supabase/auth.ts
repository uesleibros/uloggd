import "server-only";
import { cache } from "react";
import { createClient } from "./server";

export type AuthUser = { id: string; email: string | null };

export const getSupabase = cache(createClient);

// Verifies the JWT locally via getClaims (no Auth server round-trip on
// projects with asymmetric signing keys) and dedupes across layout and
// pages within a single request.
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  if (process.env.ULOGGD_E2E === "1") return null;
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,avatar_url,verified")
    .eq("id", user.id)
    .maybeSingle();
  return {
    email: user.email ?? "",
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    verified: profile?.verified ?? false,
  };
});
