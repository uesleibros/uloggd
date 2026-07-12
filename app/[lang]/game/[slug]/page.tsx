import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, Play, Star } from "lucide-react";
import { GameMediaGallery } from "@/components/game-media-gallery";
import { CoverSelector } from "@/components/library/cover-selector";
import { GameActionPanel } from "@/components/library/game-action-panel";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { getGameBySlug } from "@/lib/igdb";
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
  const eventDate = (timestamp: number | null) =>
    timestamp
      ? new Intl.DateTimeFormat(lang, {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(timestamp * 1000))
      : null;

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
        </div>
      </div>
      <div className="game-extended-content">
        <GameMediaGallery items={game.gallery} lang={lang} />
        {game.videos.length > 0 && (
          <section className="game-section">
            <header className="game-section-heading">
              <div>
                <span>VIDEO</span>
                <h2>{lang === "pt-BR" ? "Vídeos" : "Videos"}</h2>
              </div>
              <small>{game.videos.length}</small>
            </header>
            <div className="game-video-grid">
              {game.videos.map((video) => (
                <article key={video.id}>
                  <div>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                      title={video.name}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <h3>
                    <Play size={12} fill="currentColor" />
                    {video.name}
                  </h3>
                </article>
              ))}
            </div>
          </section>
        )}
        {game.events.length > 0 && (
          <section className="game-section">
            <header className="game-section-heading">
              <div>
                <span>{lang === "pt-BR" ? "ATUALIZAÇÕES" : "UPDATES"}</span>
                <h2>
                  {lang === "pt-BR" ? "Notícias e eventos" : "News and events"}
                </h2>
              </div>
              <small>{game.events.length}</small>
            </header>
            <div className="game-event-list">
              {game.events.map((event) => {
                const href =
                  event.liveStreamUrl ||
                  `https://www.igdb.com/events/${event.slug}`;
                return (
                  <a
                    key={event.id}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="game-event-image">
                      {event.imageUrl ? (
                        <Image src={event.imageUrl} alt="" fill sizes="90px" />
                      ) : (
                        <CalendarDays size={18} />
                      )}
                    </div>
                    <div>
                      <span>{eventDate(event.startTimestamp)}</span>
                      <h3>{event.name}</h3>
                      {event.description && <p>{event.description}</p>}
                    </div>
                    {event.liveStreamUrl ? (
                      <Play size={15} />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                  </a>
                );
              })}
            </div>
          </section>
        )}
        {game.websites.length > 0 && (
          <section className="game-section game-links-section">
            <header className="game-section-heading">
              <div>
                <span>WEB</span>
                <h2>{lang === "pt-BR" ? "Links" : "Links"}</h2>
              </div>
            </header>
            <div>
              {game.websites.map((website) => {
                const host = new URL(website).hostname.replace(/^www\./, "");
                return (
                  <a
                    key={website}
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {host}
                    <ExternalLink size={12} />
                  </a>
                );
              })}
            </div>
          </section>
        )}
        {game.related.map((group) => {
          const labels =
            lang === "pt-BR"
              ? {
                  expansions: ["CONTEÚDO", "DLCs e expansões"],
                  editions: ["VERSÕES", "Edições e ports"],
                  remakes: ["NOVAS VERSÕES", "Remakes e remasters"],
                  similar: ["DESCUBRA", "Jogos relacionados"],
                }
              : {
                  expansions: ["CONTENT", "DLCs and expansions"],
                  editions: ["VERSIONS", "Editions and ports"],
                  remakes: ["NEW VERSIONS", "Remakes and remasters"],
                  similar: ["DISCOVER", "Related games"],
                };
          const [eyebrow, title] = labels[group.kind];
          return (
            <section
              className="game-section game-related-section"
              key={group.kind}
            >
              <header className="game-section-heading">
                <div>
                  <span>{eyebrow}</span>
                  <h2>{title}</h2>
                </div>
                <small>{group.games.length}</small>
              </header>
              <div className="game-related-shelf">
                {group.games.map((related) => (
                  <QuickGameCard
                    key={related.id}
                    game={related}
                    initial={savedById.get(related.id) ?? null}
                    lang={lang}
                    enabled={Boolean(user)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
