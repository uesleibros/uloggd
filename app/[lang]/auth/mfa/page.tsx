import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MfaChallenge } from "@/components/auth/mfa-challenge";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { mfaChallengeRequired } from "@/lib/mfa-challenge";
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
  const challenge = await mfaChallengeRequired(supabase);
  if (challenge !== true) redirect(`/${lang}`);

  return (
    <main className="mfa-challenge-page">
      <MfaChallenge lang={lang} />
    </main>
  );
}
