import type { Metadata } from "next";
import {
  Gamepad2,
  LibraryBig,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { LoginPanel } from "@/components/auth/login-panel";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getDictionary, hasLocale } from "../dictionaries";
import { tri } from "@/lib/ui-text";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = await getDictionary(lang);
  return {
    title: d.auth.metadataTitle,
    description: d.auth.description,
    ...privatePageMetadata,
  };
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
        "Crie listas do seu jeito",
        "Create lists your way",
        "Crea listas a tu manera",
      ),
      tri(
        lang,
        "Monte rankings, coleções e listas personalizadas com os jogos que quiser.",
        "Build rankings, collections, and custom lists with any games you want.",
        "Crea rankings, colecciones y listas personalizadas con los juegos que quieras.",
      ),
    ],
    [
      MessageSquareText,
      tri(
        lang,
        "Compartilhe suas opiniões",
        "Share your opinions",
        "Comparte tus opiniones",
      ),
      tri(
        lang,
        "Publique avaliações e registre o que cada jogo significou para você.",
        "Publish reviews and record what each game meant to you.",
        "Publica reseñas y registra lo que cada juego significó para ti.",
      ),
    ],
    [
      Sparkles,
      tri(
        lang,
        "Descubra novos jogos",
        "Discover new games",
        "Descubre nuevos juegos",
      ),
      tri(
        lang,
        "Encontre sua próxima experiência através de avaliações, listas e perfis.",
        "Find your next experience through reviews, lists, and profiles.",
        "Encuentra tu próxima experiencia mediante reseñas, listas y perfiles.",
      ),
    ],
    [
      Gamepad2,
      tri(
        lang,
        "Construa seu perfil gamer",
        "Build your gaming profile",
        "Construye tu perfil gamer",
      ),
      tri(
        lang,
        "Mostre seus jogos favoritos, seu histórico e tudo que faz parte da sua jornada.",
        "Show your favorite games, your history, and everything in your gaming journey.",
        "Muestra tus juegos favoritos, tu historial y todo lo que forma parte de tu recorrido.",
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
        "Sua biblioteca, listas e preferências permanecem sincronizadas com sua conta.",
        "Your library, lists, and preferences stay synchronized with your account.",
        "Tu biblioteca, listas y preferencias permanecen sincronizadas con tu cuenta.",
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
