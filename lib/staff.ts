import "server-only";
import { getNavigationAccount } from "@/lib/supabase/auth";

/**
 * Whether whoever is reading this page moderates the platform.
 *
 * No read of its own: the navigation already reads the account for the header,
 * cached for the request, and that answer carries the role. `profiles.role` is
 * revoked from `authenticated`, so the role in it came from the definer
 * function that answers for the caller alone.
 */
export async function viewerIsStaff(): Promise<boolean> {
  const account = await getNavigationAccount();
  return account?.role === "MODERATOR" || account?.role === "ADMIN";
}
