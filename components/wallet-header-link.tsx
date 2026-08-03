import "server-only";
import Link from "next/link";
import { cache } from "react";
import { Wallet } from "lucide-react";
import { getProfileMinerals, totalMinerals } from "@/lib/minerals";
import { getSupabase } from "@/lib/supabase/auth";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The wallet button, and the only place the wallet lives.
 *
 * It used to be in the sidebar and in the account menu as well. Three doors to
 * one room read as three rooms, so the other two are gone and this is it.
 *
 * One component for the desktop header and the mobile one, because they were
 * drifting: the count added to one would have quietly been missing from the
 * other, which is how the two copies came to differ in the first place.
 */

/**
 * Cached for the request, since the header renders this twice, once per
 * layout. Without it a single page view would ask the database for the same
 * wallet two times over.
 */
const walletSummary = cache(async (userId: string) => {
  const supabase = await getSupabase();
  const [{ data: profile }, minerals] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    getProfileMinerals(supabase, userId),
  ]);
  if (!profile?.username) return null;
  return { username: profile.username, held: totalMinerals(minerals) };
});

export async function WalletHeaderLink({
  lang,
  userId,
}: {
  lang: UiLang;
  userId: string;
}) {
  const wallet = await walletSummary(userId);
  if (!wallet) return null;
  const label = tri(lang, "Carteira", "Wallet", "Cartera");
  return (
    <Link
      className="header-wallet-link"
      href={`/${lang}/wallet/${wallet.username}`}
      // The count goes in the name, not only in the chip: somebody using a
      // reader should hear what they have without opening the page.
      aria-label={wallet.held ? `${label} · ${wallet.held}` : label}
    >
      <Wallet size={17} aria-hidden />
      {/* Only when there is something in it. A zero pinned to the header would
          be a standing reminder of an empty wallet on every new account, which
          is the opposite of what a badge is for. */}
      {wallet.held > 0 && (
        <span className="header-wallet-count" aria-hidden>
          {wallet.held > 99 ? "99+" : wallet.held}
        </span>
      )}
    </Link>
  );
}
