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
  return (
    <main className="login-shell auth-single">
      <UsernamePanel lang={lang} />
    </main>
  );
}
