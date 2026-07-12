import { notFound } from "next/navigation";
import { CoverSelector } from "@/components/library/cover-selector";
import { getGameBySlug } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../dictionaries";

export default async function GamePage({
  params,
}: PageProps<"/[lang]/game/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [game, supabase] = await Promise.all([
    getGameBySlug(slug),
    createClient(),
  ]);
  if (!game) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: state } = user
    ? await supabase
        .from("user_games")
        .select(
          "status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
        )
        .eq("profile_id", user.id)
        .eq("igdb_id", game.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="game-page">
      <CoverSelector
        game={game}
        covers={game.alternativeCovers}
        savedCover={state?.custom_cover_url ?? null}
        lang={lang}
        enabled={Boolean(user)}
      />
      <div className="game-page-content">
        <span>
          {[game.releaseYear, ...game.genres].filter(Boolean).join(" · ")}
        </span>
        <h1>{game.name}</h1>
        <p>
          {game.summary ||
            (lang === "pt-BR"
              ? "Mais informações em breve."
              : "More information coming soon.")}
        </p>
      </div>
    </main>
  );
}
