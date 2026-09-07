import "server-only";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { getNavigationAccount } from "@/lib/supabase/auth";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The wallet button, and the only place the wallet lives.
 *
 * It used to be in the sidebar and in the account menu as well. Three doors to
 * one room read as three rooms, so the other two are gone and this is it.
 *
 * One component for the desktop header and the mobile one, because they were
 * drifting: a change made to one would quietly have been missing from the
 * other, which is how the two copies came to differ in the first place.
 */

/**
 * Cached for the request, since the header renders this twice, once per
 * layout. Without it a single page view would look the same username up twice.
 */
async function walletUsername(userId: string) {
  const account = await getNavigationAccount();
  return account?.id === userId ? account.username : null;
}

export async function WalletHeaderLink({
  lang,
  userId,
}: {
  lang: UiLang;
  userId: string;
}) {
  const username = await walletUsername(userId);
  if (!username) return null;
  return (
    <Link
      className="header-wallet-link"
      href={`/${lang}/wallet/${username}`}
      aria-label={tri(lang, "Carteira", "Wallet", "Cartera")}
    >
      <Wallet size={17} aria-hidden />
    </Link>
  );
}
