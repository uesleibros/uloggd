import { notFound, redirect } from "next/navigation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function ListsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/lists">) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/lists`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") next.set(key, value);
    else if (Array.isArray(value))
      value.forEach((item) => next.append(key, item));
  }
  redirect(`/${lang}/lists/${profile.username}${next.size ? `?${next}` : ""}`);
}
