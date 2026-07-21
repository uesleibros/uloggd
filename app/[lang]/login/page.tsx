import type { Metadata } from "next";
import { LibraryBig, ListChecks, RefreshCw } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { LoginPanel } from "@/components/auth/login-panel";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getDictionary, hasLocale } from "../dictionaries";
import { tri } from "@/lib/ui-text";

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
  const supabase = await getSupabase();
  const [user, d] = await Promise.all([getAuthUser(), getDictionary(lang)]);
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.username ? `/${lang}` : `/${lang}/onboarding/username`);
  }
  const highlights = [
    [
      LibraryBig,
      tri(
        lang,
        "Organize sua biblioteca",
        "Organize your library",
        "Organiza tu biblioteca",
      ),
      tri(
        lang,
        "Acompanhe o que quer jogar, o que está jogando e o que já terminou.",
        "Track what you want to play, what you are playing, and what you have finished.",
        "Sigue lo que quieres jugar, lo que estás jugando y lo que ya terminaste.",
      ),
    ],
    [
      ListChecks,
      tri(
        lang,
        "Registre do seu jeito",
        "Log it your way",
        "Registra a tu manera",
      ),
      tri(
        lang,
        "Guarde avaliações, listas e pensamentos sobre os jogos que fazem parte da sua história.",
        "Keep reviews, lists, and thoughts about the games that are part of your story.",
        "Guarda reseñas, listas y pensamientos sobre los juegos que forman parte de tu historia.",
      ),
    ],
    [
      RefreshCw,
      tri(
        lang,
        "Continue em qualquer dispositivo",
        "Continue on any device",
        "Continúa en cualquier dispositivo",
      ),
      tri(
        lang,
        "Sua biblioteca e preferências permanecem sincronizadas com sua conta.",
        "Your library and preferences stay synchronized with your account.",
        "Tu biblioteca y tus preferencias permanecen sincronizadas con tu cuenta.",
      ),
    ],
  ] as const;
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
