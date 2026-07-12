import type { Metadata } from "next";
import { LibraryBig, ListChecks, RefreshCw } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { LoginPanel } from "@/components/auth/login-panel";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, hasLocale } from "../dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = await getDictionary(lang);
  return { title: d.auth.metadataTitle, description: d.auth.description };
}

export default async function LoginPage({
  params,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    d,
  ] = await Promise.all([supabase.auth.getUser(), getDictionary(lang)]);
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.username ? `/${lang}` : `/${lang}/onboarding/username`);
  }
  const highlights =
    lang === "pt-BR"
      ? ([
          [
            LibraryBig,
            "Organize sua biblioteca",
            "Acompanhe o que quer jogar, o que está jogando e o que já terminou.",
          ],
          [
            ListChecks,
            "Registre do seu jeito",
            "Guarde avaliações, listas e pensamentos sobre os jogos que fazem parte da sua história.",
          ],
          [
            RefreshCw,
            "Continue em qualquer dispositivo",
            "Sua biblioteca e preferências permanecem sincronizadas com sua conta.",
          ],
        ] as const)
      : ([
          [
            LibraryBig,
            "Organize your library",
            "Track what you want to play, what you are playing, and what you have finished.",
          ],
          [
            ListChecks,
            "Log it your way",
            "Keep reviews, lists, and thoughts about the games that are part of your story.",
          ],
          [
            RefreshCw,
            "Continue on any device",
            "Your library and preferences stay synchronized with your account.",
          ],
        ] as const);
  return (
    <main className="login-shell">
      <aside className="login-library" aria-label={d.auth.libraryLabel}>
        <div className="login-library-copy">
          <h2>{d.auth.libraryLabel}</h2>
          <p>{d.auth.libraryHint}</p>
        </div>
        <div className="login-highlight-list">
          {highlights.map(([Icon, title, description], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon size={20} />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </aside>
      <LoginPanel lang={lang} dictionary={d} />
    </main>
  );
}
