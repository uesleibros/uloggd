import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock3, Gauge, Play, Star, Trophy } from "lucide-react";
import { GameExtendedContent } from "@/components/game-extended-content";
import { GameMediaGallery } from "@/components/game-media-gallery";
import { GamePageTabs } from "@/components/game-page-tabs";
import { SpawndGamePanel } from "@/components/spawnd-game-panel";
import { CoverSelector } from "@/components/library/cover-selector";
import { GameActionPanel } from "@/components/library/game-action-panel";
import { GameLogActions } from "@/components/social/game-log-actions";
import { ActivityStream } from "@/components/social/activity-stream";
import { getGameBySlug } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { createClient } from "@/lib/supabase/server";
import { getActivity } from "@/lib/social";
import { getSpawndGame } from "@/lib/spawnd";
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
  const [savedResult, listsResult, reviewResult, logResult, communityEntries] =
    await Promise.all([
      user
        ? supabase
            .from("user_games")
            .select(
              "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
            )
            .eq("profile_id", user.id)
            .in("igdb_id", [game.id, ...relatedIds])
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("game_lists")
            .select("id,name")
            .eq("profile_id", user.id)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("reviews")
            .select("id,rating,content,contains_spoilers,visibility")
            .eq("profile_id", user.id)
            .eq("igdb_id", game.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("diary_entries")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", user.id)
            .eq("igdb_id", game.id)
        : Promise.resolve({ count: 0 }),
      getActivity(supabase, {
        gameId: game.id,
        limit: 12,
        viewerId: user?.id ?? null,
      }),
    ]);
  const savedGames = savedResult.data;
  const userLists = listsResult.data;
  const ownReview = reviewResult.data;
  const ownLogCount = logResult.count;
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
  const spawnd = getSpawndGame({
    name: game.name,
    websites: game.websites,
    lang,
  });
  return (
    <main className="game-page">
      <section className="game-stage">
        {game.heroUrl && (
          <div className="game-hero">
            <Image src={game.heroUrl} alt="" fill priority sizes="1200px" />
            <div />
          </div>
        )}
        <div className="game-stage-inner">
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
              {game.developers.length > 0 && (
                <span>{game.developers.join(", ")}</span>
              )}
              <span>{game.releaseYear ?? "TBA"}</span>
            </div>
            <h1>{game.name}</h1>
            {game.summary && (
              <p className="game-stage-description">{game.summary}</p>
            )}
            <GameActionPanel
              game={game}
              initial={state}
              lang={lang}
              enabled={Boolean(user)}
            />
            {user && (
              <GameLogActions
                game={game}
                lang={lang}
                lists={userLists ?? []}
                initialRating={state?.quick_rating ?? null}
                initialReview={ownReview}
                logCount={ownLogCount ?? 0}
              />
            )}
          </div>
          <aside className="game-stage-rail">
            <div className="game-score-line">
              <span>
                {lang === "pt-BR" ? "NOTA DO CATÁLOGO" : "CATALOG SCORE"}
              </span>
              <div>
                <Star size={17} fill="currentColor" />
                <strong>{game.rating ?? "—"}</strong>
                <small>/100</small>
              </div>
              <p>
                {game.ratingCount.toLocaleString(lang)}{" "}
                {lang === "pt-BR" ? "avaliações" : "ratings"}
              </p>
            </div>
          </aside>
        </div>
      </section>
      <GamePageTabs
        lang={lang}
        overview={
          <div className="game-body-layout">
            <div className="game-wide-content">
              <section className="game-summary game-surface">
                <header className="game-panel-heading">
                  <span>{lang === "pt-BR" ? "VISÃO GERAL" : "OVERVIEW"}</span>
                  <h2>
                    {lang === "pt-BR" ? "Sobre o jogo" : "About the game"}
                  </h2>
                </header>
                <p>
                  {game.summary ||
                    (lang === "pt-BR"
                      ? "Mais informações em breve."
                      : "More information coming soon.")}
                </p>
              </section>
              <section className="game-details-panel game-surface">
                <header className="game-panel-heading">
                  <span>
                    {lang === "pt-BR" ? "INFORMAÇÕES" : "INFORMATION"}
                  </span>
                  <h2>{lang === "pt-BR" ? "Detalhes" : "Details"}</h2>
                </header>
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
                      <dt>
                        {lang === "pt-BR" ? "Publicação" : "Published by"}
                      </dt>
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
              </section>
              {game.languages.length > 0 && (
                <section className="game-languages-panel game-surface">
                  <header className="game-panel-heading">
                    <span>
                      {lang === "pt-BR" ? "LOCALIZAÇÃO" : "LOCALIZATION"}
                    </span>
                    <h2>
                      {lang === "pt-BR"
                        ? "Idiomas suportados"
                        : "Supported languages"}
                    </h2>
                  </header>
                  <div className="game-language-table-wrap">
                    <table className="game-language-table">
                      <thead>
                        <tr>
                          <th scope="col">
                            {lang === "pt-BR" ? "Idioma" : "Language"}
                          </th>
                          <th scope="col">Interface</th>
                          <th scope="col">
                            {lang === "pt-BR" ? "Áudio" : "Audio"}
                          </th>
                          <th scope="col">
                            {lang === "pt-BR" ? "Legendas" : "Subtitles"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.languages.map((language) => (
                          <tr key={language.name}>
                            <th scope="row">
                              {language.name}
                              {language.nativeName &&
                                language.nativeName !== language.name && (
                                  <small>{language.nativeName}</small>
                                )}
                            </th>
                            {(["Interface", "Audio", "Subtitles"] as const).map(
                              (support) => {
                                const supported =
                                  language.support.includes(support);
                                return (
                                  <td key={support}>
                                    {supported ? (
                                      <>
                                        <Check size={14} aria-hidden />
                                        <span className="sr-only">
                                          {lang === "pt-BR"
                                            ? "Disponível"
                                            : "Available"}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span aria-hidden>—</span>
                                        <span className="sr-only">
                                          {lang === "pt-BR"
                                            ? "Indisponível"
                                            : "Unavailable"}
                                        </span>
                                      </>
                                    )}
                                  </td>
                                );
                              },
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
            <aside className="game-context-rail">
              <section className="game-time-panel game-surface">
                <header>
                  <Clock3 size={16} />
                  <div>
                    <span>{lang === "pt-BR" ? "DURAÇÃO" : "PLAYTIME"}</span>
                    <h2>
                      {lang === "pt-BR" ? "Tempo para zerar" : "Time to beat"}
                    </h2>
                  </div>
                </header>
                <dl>
                  <div>
                    <dt>
                      <Gauge size={13} />
                      {lang === "pt-BR" ? "Campanha" : "Main story"}
                    </dt>
                    <dd>{duration(game.timeToBeat?.hastily ?? null)}</dd>
                  </div>
                  <div>
                    <dt>
                      <Play size={13} />
                      {lang === "pt-BR" ? "Com extras" : "With extras"}
                    </dt>
                    <dd>{duration(game.timeToBeat?.normally ?? null)}</dd>
                  </div>
                  <div>
                    <dt>
                      <Trophy size={13} />
                      100%
                    </dt>
                    <dd>{duration(game.timeToBeat?.completely ?? null)}</dd>
                  </div>
                </dl>
                {game.timeToBeat && game.timeToBeat.count > 0 ? (
                  <p>
                    {game.timeToBeat.count.toLocaleString(lang)}{" "}
                    {lang === "pt-BR"
                      ? "registros no IGDB"
                      : "IGDB submissions"}
                  </p>
                ) : (
                  <p>
                    {lang === "pt-BR"
                      ? "Duração ainda não disponível na IGDB."
                      : "Playtime is not available on IGDB yet."}
                  </p>
                )}
              </section>
              {similarGames.length > 0 && (
                <section className="game-similar-rail game-surface">
                  <header>
                    <span>{lang === "pt-BR" ? "DESCUBRA" : "DISCOVER"}</span>
                    <h2>
                      {lang === "pt-BR" ? "Jogos similares" : "Similar games"}
                    </h2>
                  </header>
                  <div>
                    {similarGames.slice(0, 5).map((similar) => (
                      <Link
                        key={similar.id}
                        href={`/${lang}/game/${similar.slug}`}
                      >
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
        }
        media={
          game.gallery.length > 0 || game.videos.length > 0 ? (
            <div className="game-tab-stack">
              <GameMediaGallery items={game.gallery} lang={lang} />
              <GameExtendedContent
                game={game}
                groups={[]}
                saved={{}}
                lang={lang}
                enabled={Boolean(user)}
                sections={["videos"]}
                showRelated={false}
              />
            </div>
          ) : undefined
        }
        updates={
          game.events.length > 0 || game.websites.length > 0 ? (
            <GameExtendedContent
              game={game}
              groups={[]}
              saved={{}}
              lang={lang}
              enabled={Boolean(user)}
              sections={["updates", "links"]}
              showRelated={false}
            />
          ) : undefined
        }
        related={
          tabbedRelated.length > 0 ? (
            <GameExtendedContent
              game={game}
              groups={tabbedRelated}
              saved={savedRelated}
              lang={lang}
              enabled={Boolean(user)}
              sections={[]}
            />
          ) : undefined
        }
        spawnd={
          <SpawndGamePanel
            lang={lang}
            gameName={game.name}
            available={spawnd.available}
            gameUrl={spawnd.gameUrl}
            embedUrl={spawnd.embedUrl}
            catalogUrl={spawnd.catalogUrl}
          />
        }
        community={
          <section className="game-community-section game-surface">
            <div className="social-section-title">
              <div>
                <h2>{lang === "pt-BR" ? "Comunidade" : "Community"}</h2>
                <p>
                  {lang === "pt-BR"
                    ? "Avaliações e sessões recentes"
                    : "Recent reviews and sessions"}
                </p>
              </div>
            </div>
            <ActivityStream
              entries={communityEntries}
              lang={lang}
              viewerId={user?.id}
            />
          </section>
        }
      />
    </main>
  );
}
