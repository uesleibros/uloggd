import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsernamePanel } from "@/components/auth/username-panel";
import { hasLocale } from "../../dictionaries";

export default async function Page({
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
  if (!user) redirect(`/${lang}/login`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.username) redirect(`/${lang}/u/${profile.username}`);
  const raw = String(
    user.user_metadata?.preferred_username ||
      user.user_metadata?.user_name ||
      user.user_metadata?.name ||
      "",
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);
  return (
    <main className="login-shell auth-single">
      <UsernamePanel
        lang={lang}
        suggestion={raw.length >= 3 ? raw : undefined}
      />
    </main>
  );
}
