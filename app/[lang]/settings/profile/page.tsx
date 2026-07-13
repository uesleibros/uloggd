import { notFound, redirect } from "next/navigation";
import { ProfileSettingsPanel } from "@/components/settings/profile-settings-panel";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../dictionaries";

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/settings/profile`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,pronouns,bio,avatar_url,banner_url")
    .eq("id", user.id)
    .single();
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  return <ProfileSettingsPanel initial={profile} lang={lang} />;
}
