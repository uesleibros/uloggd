import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { LoginPanel } from "@/components/auth/login-panel";
import { getPopularGames } from "@/lib/igdb";
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
    games,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getDictionary(lang),
    getPopularGames().catch(() => []),
  ]);
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.username ? `/${lang}` : `/${lang}/onboarding/username`);
  }

  const shelf = games.slice(0, 5);

  return (
    <main className="login-shell">
      <aside className="login-library" aria-label={d.auth.libraryLabel}>
        <div className="login-library-copy">
          <h2>{d.auth.libraryLabel}</h2>
          <p>{d.auth.libraryHint}</p>
        </div>
        {shelf.length > 0 && (
          <div className="login-cover-row" aria-hidden="true">
            {shelf.map((game, index) => (
              <div
                className="login-cover"
                key={game.id}
                style={{ "--cover-index": index } as CSSProperties}
              >
                <Image src={game.coverUrl} alt="" fill sizes="130px" />
              </div>
            ))}
          </div>
        )}
        <div className="login-library-rule" />
      </aside>
      <LoginPanel lang={lang} dictionary={d} />
    </main>
  );
}
