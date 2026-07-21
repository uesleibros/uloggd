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
  const [
    { data: profile },
    { count: infractions },
    { data: blockRows },
    { data: requestRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username,username_changed_at,display_name,pronouns,bio,drawer,thought,avatar_url,banner_url,birth_date,youtube_username,instagram_username,twitter_username,custom_cover_scope,profile_comment_scope,content_comment_scope,profile_visibility,is_private",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("profile_infractions")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id),
    supabase
      .from("blocks")
      .select(
        "blocked_id,blocked:profiles!blocks_blocked_id_fkey(id,username,display_name)",
      )
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("follow_requests")
      .select(
        "requester_id,requester:profiles!follow_requests_requester_id_fkey(id,username,display_name,avatar_url)",
      )
      .eq("target_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  return (
    <AccountSettings
      profile={profile}
      blockedProfiles={(blockRows ?? []).flatMap((row) => {
        const blocked = Array.isArray(row.blocked)
          ? row.blocked[0]
          : row.blocked;
        return blocked?.username ? [blocked] : [];
      })}
      followRequests={(requestRows ?? []).flatMap((row) => {
        const requester = Array.isArray(row.requester)
          ? row.requester[0]
          : row.requester;
        return requester?.username ? [requester] : [];
      })}
      infractions={infractions ?? 0}
      lang={lang}
    />
  );
}
