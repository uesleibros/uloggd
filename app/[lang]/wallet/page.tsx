import { notFound, redirect } from "next/navigation";
import { serverApi, settleServer } from "@/lib/api-server";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

/**
 * The signed-in shortcut, mirroring `/reviews`, `/lists` and `/shots`: the
 * sidebar points here and it forwards to the viewer's own wallet, so the URL
 * that ends up shared is always somebody's rather than "mine".
 */
type Props = { params: Promise<{ lang: string }> };

export default async function WalletShortcutPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  // `/me` answers for whoever the request belongs to, so no answer and being
  // signed out are the same thing here.
  const { data: me } = await settleServer(
    serverApi.get<{ owner: { username: string | null } }>("/me"),
  );
  if (!me) redirect(`/${lang}/login?next=/${lang}/wallet`);
  if (!me.owner.username) redirect(`/${lang}/onboarding/username`);
  redirect(`/${lang}/wallet/${me.owner.username}`);
}
