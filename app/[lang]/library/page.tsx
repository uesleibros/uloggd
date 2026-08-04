import { notFound, redirect } from "next/navigation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function LibraryPage({
  params,
}: PageProps<"/[lang]/library">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/library`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  redirect(`/${lang}/library/${profile.username}`);
}
