import { notFound, redirect } from "next/navigation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getOwnAgeProfile } from "@/lib/own-age-profile";
import { UsernamePanel } from "@/components/auth/username-panel";
import { BirthDatePanel } from "@/components/auth/birth-date-panel";
import { hasLocale } from "../../dictionaries";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login`);
  // Two round trips because the two fields no longer live in the same readable
  // place: `birth_date` is only reachable through the definer function that
  // scopes it to the caller.
  const [{ data: profile }, age] = await Promise.all([
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle(),
    getOwnAgeProfile(supabase),
  ]);
  if (profile?.username && age?.birth_date) redirect(`/${lang}`);
  return (
    <main className="login-shell auth-single">
      {profile?.username ? (
        <BirthDatePanel lang={lang} />
      ) : (
        <UsernamePanel lang={lang} />
      )}
    </main>
  );
}
