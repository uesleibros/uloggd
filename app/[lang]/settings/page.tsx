import { notFound, redirect } from "next/navigation";
import { AccountSettings } from "@/components/settings/account-settings";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";

export default async function SettingsPage({
  params,
}: PageProps<"/[lang]/settings">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/settings?tab=general`);
  const [{ data: profile }, { count: infractions }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username,display_name,pronouns,bio,thought,avatar_url,banner_url,birth_date,youtube_username,instagram_username,twitter_username",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("profile_infractions")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id),
  ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  return (
    <AccountSettings
      profile={profile}
      infractions={infractions ?? 0}
      lang={lang}
    />
  );
}
