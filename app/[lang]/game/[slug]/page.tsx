import Image from "next/image";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { CoverSelector } from "@/components/library/cover-selector";
import { GameActionPanel } from "@/components/library/game-action-panel";
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
  const releaseDate = game.releaseTimestamp
    ? new Intl.DateTimeFormat(lang, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(game.releaseTimestamp * 1000))
    : lang === "pt-BR"
      ? "Data a confirmar"
      : "Date to be confirmed";

  return (
    <main className="game-page">
      {game.heroUrl && (
        <div className="game-hero">
          <Image src={game.heroUrl} alt="" fill priority sizes="1080px" />
          <div />
        </div>
      )}
      <div className="game-layout">
        <CoverSelector
          game={game}
          covers={game.alternativeCovers}
          savedCover={state?.custom_cover_url ?? null}
          lang={lang}
          enabled={Boolean(user)}
        />
        <div className="game-page-content">
          <div className="game-title-meta">
            <span>{game.releaseYear ?? "TBA"}</span>
            {game.developers.length > 0 && (
              <span>{game.developers.join(", ")}</span>
            )}
          </div>
          <h1>{game.name}</h1>
          <GameActionPanel
            game={game}
            initial={state}
            lang={lang}
            enabled={Boolean(user)}
          />
          <div className="game-score-line">
            <div>
              <Star size={16} fill="currentColor" />
              <strong>{game.rating ?? "—"}</strong>
              <span>/100</span>
            </div>
            <p>
              {game.ratingCount.toLocaleString(lang)}{" "}
              {lang === "pt-BR" ? "avaliações no catálogo" : "catalog ratings"}
            </p>
          </div>
          <section className="game-summary">
            <h2>{lang === "pt-BR" ? "Sobre" : "About"}</h2>
            <p>
              {game.summary ||
                (lang === "pt-BR"
                  ? "Mais informações em breve."
                  : "More information coming soon.")}
            </p>
          </section>
          <dl className="game-details">
            <div>
              <dt>{lang === "pt-BR" ? "Lançamento" : "Released"}</dt>
              <dd>{releaseDate}</dd>
            </div>
            <div>
              <dt>{lang === "pt-BR" ? "Gêneros" : "Genres"}</dt>
              <dd>{game.genres.join(" · ") || "—"}</dd>
            </div>
            <div>
              <dt>{lang === "pt-BR" ? "Plataformas" : "Platforms"}</dt>
              <dd>{game.platforms.join(" · ") || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
