import type { SupabaseClient } from "@supabase/supabase-js";

export async function mfaChallengeRequired(
  supabase: SupabaseClient,
): Promise<boolean | null> {
  const [
    { data: userData, error: userError },
    { data: claimsData, error: claimsError },
  ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getClaims()]);
  if (userError || claimsError || !userData.user || !claimsData) return null;
  const enrolled = (userData.user.factors ?? []).some(
    (factor) => factor.status === "verified",
  );
  return enrolled && (claimsData.claims.aal ?? "aal1") !== "aal2";
}
