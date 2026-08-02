import { notFound, redirect } from "next/navigation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";

/**
 * The signed-in shortcut, mirroring `/reviews`, `/lists` and `/shots`: the
 * sidebar points here and it forwards to the viewer's own wallet, so the URL
 * that ends up shared is always somebody's rather than "mine".
 */
type Props = { params: Promise<{ lang: string }> };

export default async function WalletShortcutPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/wallet`);
  const supabase = await getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  redirect(`/${lang}/wallet/${profile.username}`);
}
