import { notFound, redirect } from "next/navigation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

/**
 * The signed-in shortcut, mirroring `/reviews` and `/lists`: this is what the
 * sidebar points at, and it forwards to the viewer's own gallery so the URL
 * that gets shared is always someone's, never "mine".
 */
type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ScreenshotsPage({ params, searchParams }: Props) {
  const [{ lang }, requested] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/shots`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(requested)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value))
      value.forEach((item) => query.append(key, item));
  }
  redirect(
    `/${lang}/shots/${profile.username}${query.size ? `?${query}` : ""}`,
  );
}
