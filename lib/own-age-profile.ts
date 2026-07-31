import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The caller's own age data, which no longer comes from `profiles`.
 *
 * Those columns were world-readable until the privilege fix: row-level security
 * cannot restrict columns, so `profiles_public_read` exposed every user's exact
 * birth date to anyone holding the publishable key. The columns are now revoked
 * from `anon` and `authenticated` alike, and `own_age_profile()` is the only
 * way in — a definer function that answers for `auth.uid()` and nobody else.
 *
 * Wrapped here so the four callers share one shape, and so the reason travels
 * with the call instead of living only in the migration.
 */
export type OwnAgeProfile = {
  birth_date: string | null;
  age_assured_at: string | null;
  age_assurance_method: string | null;
};

export async function getOwnAgeProfile(
  supabase: SupabaseClient,
): Promise<OwnAgeProfile | null> {
  const { data } = await supabase
    .rpc("own_age_profile")
    .maybeSingle<OwnAgeProfile>();
  return data ?? null;
}
