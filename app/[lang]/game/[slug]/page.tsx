import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, Gauge, Play, Star, Trophy } from "lucide-react";
import { GameExtendedContent } from "@/components/game-extended-content";
import { GameMediaGallery } from "@/components/game-media-gallery";
import { CoverSelector } from "@/components/library/cover-selector";
import { GameActionPanel } from "@/components/library/game-action-panel";
import { getGameBySlug } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../dictionaries";

type Props = PageProps<"/[lang]/game/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const game = await getGameBySlug(slug);
  if (!game) return {};
  const description =
    game.summary.slice(0, 180) ||
    (lang === "pt-BR"
      ? `Informações, mídia e sua jornada em ${game.name}.`
      : `Information, media, and your journey through ${game.name}.`);
  const image = game.heroUrl ?? game.coverUrl;
  return {
    title: game.name,
    description,
    openGraph: {
      title: `${game.name} · uloggd`,
      description,
      type: "website",
      siteName: "uloggd",
      locale: lang === "pt-BR" ? "pt_BR" : "en_US",
      images: [{ url: image, alt: game.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.name} · uloggd`,
      description,
      images: [image],
    },
  };
}

export default async function GamePage({ params }: Props) {
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
  const relatedIds = game.related.flatMap((group) =>
    group.games.map((related) => related.id),
  );
  const { data: savedGames } = user
    ? await supabase
        .from("user_games")
        .select(
          "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
        )
        .eq("profile_id", user.id)
        .in("igdb_id", [game.id, ...relatedIds])
    : { data: [] };
  const savedById = new Map(
    (savedGames ?? []).map((saved) => [saved.igdb_id, saved]),
  );
  const state = savedById.get(game.id) ?? null;
  const similarGames =
    game.related.find((group) => group.kind === "similar")?.games ?? [];
  const tabbedRelated = game.related.filter(
    (group) => group.kind !== "similar",
  );
  const savedRelated = Object.fromEntries(
    relatedIds.map((id) => [id, savedById.get(id) ?? null]),
  );
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
  const duration = (seconds: number | null) => {
    if (!seconds) return "—";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h${minutes ? ` ${minutes}m` : ""}`;
  };

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
          game={{
            id: game.id,
            slug: game.slug,
            name: game.name,
            coverUrl: game.coverUrl,
          }}
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
          <section className="game-summary">
            <h2>{lang === "pt-BR" ? "Sobre" : "About"}</h2>
            <p>
              {game.summary ||
                (lang === "pt-BR"
                  ? "Mais informações em breve."
                  : "More information coming soon.")}
            </p>
          </section>
        </div>
        <div className="game-wide-content">
          <GameMediaGallery items={game.gallery} lang={lang} />
          <GameExtendedContent
            game={game}
            groups={tabbedRelated}
            saved={savedRelated}
            lang={lang}
            enabled={Boolean(user)}
          />
        </div>
        <aside className="game-context-rail">
          {game.timeToBeat && (
            <section className="game-time-panel">
              <header>
                <Clock3 size={15} />
                <div>
                  <span>
                    {lang === "pt-BR" ? "TEMPO PARA TERMINAR" : "TIME TO BEAT"}
                  </span>
                  <h2>{lang === "pt-BR" ? "Duração" : "Playtime"}</h2>
                </div>
              </header>
              <dl>
                <div>
                  <dt>
                    <Gauge size={13} />
                    {lang === "pt-BR" ? "Campanha" : "Main story"}
                  </dt>
                  <dd>{duration(game.timeToBeat.hastily)}</dd>
                </div>
                <div>
                  <dt>
                    <Play size={13} />
                    {lang === "pt-BR" ? "Com extras" : "With extras"}
                  </dt>
                  <dd>{duration(game.timeToBeat.normally)}</dd>
                </div>
                <div>
                  <dt>
                    <Trophy size={13} />
                    100%
                  </dt>
                  <dd>{duration(game.timeToBeat.completely)}</dd>
                </div>
              </dl>
              {game.timeToBeat.count > 0 && (
                <p>
                  {game.timeToBeat.count.toLocaleString(lang)}{" "}
                  {lang === "pt-BR" ? "registros no IGDB" : "IGDB submissions"}
                </p>
              )}
            </section>
          )}
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
            {game.publishers.length > 0 && (
              <div>
                <dt>{lang === "pt-BR" ? "Publicação" : "Published by"}</dt>
                <dd>{game.publishers.join(" · ")}</dd>
              </div>
            )}
            {game.themes.length > 0 && (
              <div>
                <dt>{lang === "pt-BR" ? "Temas" : "Themes"}</dt>
                <dd>{game.themes.join(" · ")}</dd>
              </div>
            )}
            {game.modes.length > 0 && (
              <div>
                <dt>{lang === "pt-BR" ? "Modos" : "Modes"}</dt>
                <dd>{game.modes.join(" · ")}</dd>
              </div>
            )}
          </dl>
          {similarGames.length > 0 && (
            <section className="game-similar-rail">
              <header>
                <span>{lang === "pt-BR" ? "DESCUBRA" : "DISCOVER"}</span>
                <h2>
                  {lang === "pt-BR" ? "Jogos similares" : "Similar games"}
                </h2>
              </header>
              <div>
                {similarGames.slice(0, 5).map((similar) => (
                  <Link key={similar.id} href={`/${lang}/game/${similar.slug}`}>
                    <span className="game-similar-cover">
                      <Image
                        src={resolveGameCover(
                          similar.coverUrl,
                          savedById.get(similar.id)?.custom_cover_url,
                        )}
                        alt=""
                        fill
                        sizes="42px"
                      />
                    </span>
                    <span>
                      <strong>{similar.name}</strong>
                      <small>
                        {[similar.releaseYear, similar.genres[0]]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
