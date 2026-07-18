import { notFound, redirect } from "next/navigation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { UsernamePanel } from "@/components/auth/username-panel";
import { BirthDatePanel } from "@/components/auth/birth-date-panel";
import { hasLocale } from "../../dictionaries";

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("username,birth_date")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.username && profile.birth_date) redirect(`/${lang}`);
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
