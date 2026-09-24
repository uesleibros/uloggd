import "server-only";
import { cache } from "react";
import { serverApi, settleServer } from "@/lib/api-server";
import type { AccountState } from "@/lib/account-types";
import { getAuthUser } from "@/lib/supabase/auth";

/**
 * Whether whoever is reading this page moderates the platform.
 *
 * `profiles.role` is revoked from `authenticated`, so this is not a select:
 * the account's own state carries it, answered by the same definer function
 * the moderation console's gate asks.
 *
 * Cached per request, because a page asks it once for itself and again for a
 * section of it, and a signed-out reader never asks at all. A failed read
 * answers "not staff": the worst it costs is a button that does not appear.
 */
export const viewerIsStaff = cache(async (): Promise<boolean> => {
  if (!(await getAuthUser())) return false;
  const { data } = await settleServer(
    serverApi.get<AccountState>("/account/state"),
  );
  const role = data?.data.role;
  return role === "MODERATOR" || role === "ADMIN";
});
