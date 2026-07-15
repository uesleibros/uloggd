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
  const [{ data: profile }, { data: verificationRequest }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,username,display_name,pronouns,bio,avatar_url,banner_url,verified",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("verification_requests")
      .select("status")
      .eq("profile_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  return (
    <ProfileSettingsPanel
      initial={profile}
      verificationStatus={verificationRequest?.status ?? null}
      lang={lang}
    />
  );
}
