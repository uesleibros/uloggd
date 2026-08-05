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
  const [{ data: profile }, age, { count: games }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle(),
    getOwnAgeProfile(supabase),
    supabase
      .from("user_games")
      .select("igdb_id", { count: "exact", head: true })
      .eq("profile_id", user.id),
  ]);
  // Named and dated, so this screen is done. One more offer before the home
  // page, and only for an account with nothing in it: the home page's personal
  // half is blank without a library, and nine accounts stopped exactly here.
  if (profile?.username && age?.birth_date)
    redirect(games ? `/${lang}` : `/${lang}/onboarding/library`);
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
