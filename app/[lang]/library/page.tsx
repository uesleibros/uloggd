import { notFound, redirect } from "next/navigation";
import { LibraryScreen } from "@/components/library/library-screen";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";

export default async function LibraryPage({
  params,
}: PageProps<"/[lang]/library">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/library`);
  const [{ data: profile }, { data: records }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,avatar_url,banner_url,library_visibility")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_games")
      .select(
        "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
      )
      .eq("profile_id", user.id),
  ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  return (
    <LibraryScreen
      profile={profile}
      records={records ?? []}
      owner
      lang={lang}
    />
  );
}
