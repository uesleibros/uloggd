import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The account rows the moderation console shows, which include `role`.
 *
 * That column is revoked from `authenticated`, so these cannot be plain
 * selects: any signed-in account could otherwise page through `profiles` and
 * read off exactly who moderates the platform. Both functions check the caller
 * with `private.is_moderator()` and answer with nothing for everyone else, so
 * the gate lives at the database rather than in whoever calls this next.
 */
export type ModerationAccount = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "USER" | "MODERATOR" | "ADMIN";
  verified: boolean;
  account_type: "PERSON" | "ORGANIZATION";
  created_at: string;
};

/** Accounts matching a console search. Under two characters returns nothing. */
export async function searchModerationAccounts(
  supabase: SupabaseClient,
  term: string,
): Promise<ModerationAccount[]> {
  if (term.trim().length < 2) return [];
  // The client carries no generated schema, so the row shape is asserted here.
  // It is checked for real by the database test that calls this function and
  // compares the columns it returns.
  const { data } = await supabase.rpc("moderation_search_accounts", { term });
  return (data as ModerationAccount[] | null) ?? [];
}

/** The profiles behind a page of reports, resolved by id. */
export async function getModerationProfiles(
  supabase: SupabaseClient,
  ids: string[],
): Promise<ModerationAccount[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.rpc("moderation_profiles", { ids });
  return (data as ModerationAccount[] | null) ?? [];
}
