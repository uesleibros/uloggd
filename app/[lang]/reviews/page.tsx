import { notFound, redirect } from "next/navigation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function ReviewsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/reviews">) {
  const [{ lang }, requested] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/reviews`);
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
    `/${lang}/reviews/${profile.username}${query.size ? `?${query}` : ""}`,
  );
}
