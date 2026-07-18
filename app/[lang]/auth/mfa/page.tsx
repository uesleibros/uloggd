import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MfaChallenge } from "@/components/auth/mfa-challenge";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";

export const metadata: Metadata = { title: "Verificação em duas etapas" };

export default async function MfaPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await getSupabase();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login`);
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!data || data.currentLevel === "aal2" || data.nextLevel !== "aal2")
    redirect(`/${lang}`);

  return (
    <main className="mfa-challenge-page">
      <MfaChallenge lang={lang} />
    </main>
  );
}
