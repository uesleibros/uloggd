import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";
import {
  Check,
  Clock3,
  Gauge,
  Play,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import { GameExtendedContent } from "@/components/game-extended-content";
import { RecordView } from "@/components/record-view";
import { GameAgeGate } from "@/components/game-age-gate";
import { GameMediaGallery } from "@/components/game-media-gallery";
import { GamePageTabs } from "@/components/game-page-tabs";
import { GameTabTrigger } from "@/components/game-tab-trigger";
import { SpawndGamePanel } from "@/components/spawnd-game-panel";
import { CoverSelector } from "@/components/library/cover-selector";
import { GameActionPanel } from "@/components/library/game-action-panel";
import { GameLogActions } from "@/components/social/game-log-actions";
import { ActivityStream } from "@/components/social/activity-stream";
import { getGameBySlug } from "@/lib/igdb";
import { isOldEnough } from "@/lib/age-access";
import {
  ANONYMOUS_AGE_COOKIE,
  readAnonymousAgeAssertion,
} from "@/lib/anonymous-age";
import { resolveGameCover } from "@/lib/game-cover";
import { jsonLd, localeAlternates, SITE_URL } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getActivity } from "@/lib/social";
import { getSpawndGame } from "@/lib/spawnd";
import { SpawndLogo } from "@/components/spawnd-logo";
import { hasLocale } from "../../dictionaries";
import { ShareButton } from "@/components/share-button";
import { tri, type UiLang } from "@/lib/ui-text";

type Props = PageProps<"/[lang]/game/[slug]">;

// Streams the community feed after first paint: getActivity fans out into
// Supabase and IGDB lookups, so it must not block the page shell.
async function GameCommunityStream({
  gameId,
  lang,
  viewerId,
}: {
  gameId: number;
  lang: UiLang;
  viewerId?: string;
}) {
  if (process.env.ULOGGD_E2E === "1")
    return <ActivityStream entries={[]} lang={lang} viewerId={viewerId} />;
  const supabase = await getSupabase();
  const entries = await getActivity(supabase, {
    gameId,
    limit: 12,
    viewerId: viewerId ?? null,
  });
  return <ActivityStream entries={entries} lang={lang} viewerId={viewerId} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const game = await getGameBySlug(slug);
  if (!game) return {};
  const description =
    game.summary.slice(0, 180) ||
    tri(
      lang,
      `Informações, mídia e sua jornada em ${game.name}.`,
      `Information, media, and your journey through ${game.name}.`,
      `Información, medios y tu recorrido en ${game.name}.`,
    );
  const image = game.heroUrl ?? game.coverUrl;
  return {
    title: game.name,
    description,
    alternates: localeAlternates(lang, `/game/${game.slug}`),
    openGraph: {
      title: `${game.name} · uloggd`,
      description,
      type: "website",
      siteName: "uloggd",
      locale: tri(lang, "pt_BR", "en_US", "es_ES"),
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

export default async function GamePage({ params, searchParams }: Props) {
  const [{ lang, slug }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const [game, user] = await Promise.all([getGameBySlug(slug), getAuthUser()]);
  if (!game) notFound();

  const supabase = process.env.ULOGGD_E2E === "1" ? null : await getSupabase();
  const brazilRating = game.ageRatings.find((rating) => rating.region === "BR");
  const minimumAge = brazilRating?.minimumAge ?? 0;
  const anonymousAge = user
    ? null
    : readAnonymousAgeAssertion(
        (await cookies()).get(ANONYMOUS_AGE_COOKIE)?.value,
      );
  const relatedIds = game.related.flatMap((group) =>
    group.games.map((related) => related.id),
  );
  const [ageProfileResult, savedResult, listsResult, logResult, journeyResult] =
    await Promise.all([
      user && supabase
        ? supabase
            .from("profiles")
            .select("birth_date")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user && supabase
        ? supabase
            .from("user_games")
            .select(
              "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
            )
            .eq("profile_id", user.id)
            .in("igdb_id", [game.id, ...relatedIds])
        : Promise.resolve({ data: [] }),
      user && supabase
        ? supabase
            .from("game_lists")
            .select("id,name")
            .eq("profile_id", user.id)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      user && supabase
        ? supabase
            .from("diary_entries")
            .select(
              "id,played_on,ended_on,minutes,note,marks_start,marks_finish,contains_spoilers,visibility,comments_scope,journey_id",
            )
            .eq("profile_id", user.id)
            .eq("igdb_id", game.id)
            .order("played_on", { ascending: false })
            .limit(366)
        : Promise.resolve({ data: [] }),
      user && supabase
        ? supabase
            .from("journeys")
            .select("id,title")
            .eq("profile_id", user.id)
            .eq("igdb_id", game.id)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);
  const ageProfile = ageProfileResult.data;
  if (user && !ageProfile?.birth_date) redirect(`/${lang}/onboarding/username`);
  if (
    brazilRating &&
    minimumAge > 0 &&
    (user
      ? !ageProfile?.birth_date ||
        !isOldEnough(ageProfile.birth_date, minimumAge)
      : anonymousAge === null || anonymousAge < minimumAge)
  ) {
    return (
      <GameAgeGate
        gameName={game.name}
        rating={brazilRating}
        lang={lang}
        signedIn={Boolean(user)}
      />
    );
  }
  const savedGames = savedResult.data;
  const userLists = listsResult.data;
  const ownJourneys = (logResult.data ?? []).map(
    (entry: {
      id: string;
      played_on: string;
      ended_on: string | null;
      minutes: number | null;
      note: string | null;
      marks_start: boolean;
      marks_finish: boolean;
      contains_spoilers: boolean;
      visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
      comments_scope: "EVERYONE" | "FOLLOWERS" | "NOBODY";
      journey_id: string | null;
    }) => ({
      id: entry.id,
      start: entry.played_on,
      end: entry.ended_on,
      minutes: entry.minutes,
      note: entry.note,
      marksStart: entry.marks_start,
      marksFinish: entry.marks_finish,
      spoilers: entry.contains_spoilers,
      visibility: entry.visibility,
      commentsScope: entry.comments_scope,
      journeyId: entry.journey_id,
    }),
  );
  const ownJourneyOptions = (journeyResult.data ?? []) as Array<{
    id: string;
    title: string;
  }>;
  const ownLogCount = ownJourneys.length;
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
    : tri(
        lang,
        "Data a confirmar",
        "Date to be confirmed",
        "Fecha por confirmar",
      );
  const duration = (seconds: number | null) => {
    if (!seconds) return "—";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h${minutes ? ` ${minutes}m` : ""}`;
  };
  const spawnd = getSpawndGame({
    igdbId: game.id,
    lang,
  });
  const ageRatings = [...game.ageRatings].sort((a, b) => {
    const preferred =
      lang === "pt-BR"
        ? ["ClassInd", "Classificação Indicativa", "ESRB", "PEGI"]
        : lang === "es"
          ? ["PEGI", "ESRB", "ClassInd"]
          : ["ESRB", "PEGI", "ClassInd"];
    const rank = (name: string) => {
      const index = preferred.findIndex((item) =>
        name.toLowerCase().includes(item.toLowerCase()),
      );
      return index === -1 ? preferred.length : index;
    };
    return rank(a.organization) - rank(b.organization);
  });
  return (
    <main className="game-page">
      {user && (
        <RecordView type="game" gameIgdbId={game.id} gameSlug={game.slug} />
      )}
      {/* VideoGame markup describes the catalog entity: title, cover, publisher
          and the aggregate score a search engine would otherwise have to infer. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: game.name,
          url: `${SITE_URL}/${lang}/game/${game.slug}`,
          image: game.coverUrl,
          ...(game.summary ? { description: game.summary } : {}),
          ...(game.releaseTimestamp
            ? {
                datePublished: new Date(game.releaseTimestamp * 1000)
                  .toISOString()
                  .slice(0, 10),
              }
            : {}),
          ...(game.genres.length ? { genre: game.genres } : {}),
          ...(game.platforms.length ? { gamePlatform: game.platforms } : {}),
          ...(game.searchFilters.publishers.length
            ? {
                publisher: game.searchFilters.publishers.map((item) => ({
                  "@type": "Organization",
                  name: item.name,
                  ...(item.slug
                    ? { url: `${SITE_URL}/${lang}/company/${item.slug}` }
                    : {}),
                })),
              }
            : {}),
          ...(game.searchFilters.developers.length
            ? {
                author: game.searchFilters.developers.map((item) => ({
                  "@type": "Organization",
                  name: item.name,
                  ...(item.slug
                    ? { url: `${SITE_URL}/${lang}/company/${item.slug}` }
                    : {}),
                })),
              }
            : {}),
          // A rating with no votes behind it is not an aggregate; omitting it
          // beats publishing a number Google would flag as unsupported.
          ...(game.rating !== null && game.ratingCount > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: game.rating,
                  ratingCount: game.ratingCount,
                  bestRating: 100,
                  worstRating: 0,
                },
              }
            : {}),
        })}
      />
      <section className="game-stage">
        {game.heroUrl && (
          <div className="game-hero">
            <Image src={game.heroUrl} alt="" fill priority sizes="1200px" />
            <div />
          </div>
        )}
        <ShareButton
          className="game-share-action game-stage-share"
          title={`${game.name} · uloggd`}
          text={tri(
            lang,
            `Veja ${game.name} no uloggd`,
            `See ${game.name} on uloggd`,
            `Mira ${game.name} en uloggd`,
          )}
          label={tri(lang, "Compartilhar", "Share", "Compartir")}
          copiedLabel={tri(
            lang,
            "Link copiado",
            "Link copied",
            "Enlace copiado",
          )}
          lang={lang}
        />
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
            {spawnd.available && (
              <GameTabTrigger className="game-spawnd-cta" tab="spawnd">
                <SpawndLogo compact />
                <span>
                  {tri(lang, "Jogar agora", "Play now", "Jugar ahora")}
                </span>
                <Play size={14} fill="currentColor" aria-hidden />
              </GameTabTrigger>
            )}
            {user && (
              <GameLogActions
                game={game}
                platforms={game.platforms}
                lang={lang}
                lists={userLists ?? []}
                logCount={ownLogCount}
                journeys={ownJourneys}
                journeyOptions={ownJourneyOptions}
                initialMode={
                  query.review === "1"
                    ? "review"
                    : query.screenshot === "1"
                      ? "screenshot"
                      : null
                }
              />
            )}
          </div>
          <aside className="game-stage-rail">
            <GameActionPanel
              game={game}
              initial={state}
              lang={lang}
              enabled={Boolean(user)}
            />
            <div className="game-score-line">
              <span>
                {tri(
                  lang,
                  "NOTA DO CATÁLOGO",
                  "CATALOG SCORE",
                  "NOTA DEL CATÁLOGO",
                )}
              </span>
              <div>
                <Star size={17} fill="currentColor" />
                <strong>{game.rating ?? "—"}</strong>
                <small>/100</small>
              </div>
              <p>
                {game.ratingCount.toLocaleString(lang)}{" "}
                {tri(lang, "avaliações", "ratings", "valoraciones")}
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
                  <h2>
                    {tri(
                      lang,
                      "Sobre o jogo",
                      "About the game",
                      "Sobre el juego",
                    )}
                  </h2>
                </header>
                <p>
                  {game.summary ||
                    tri(
                      lang,
                      "Mais informações em breve.",
                      "More information coming soon.",
                      "Más información próximamente.",
                    )}
                </p>
              </section>
              <section className="game-details-panel game-surface">
                <header className="game-panel-heading">
                  <h2>{tri(lang, "Detalhes", "Details", "Detalles")}</h2>
                </header>
                <dl className="game-details">
                  <div>
                    <dt>
                      {tri(lang, "Lançamento", "Released", "Lanzamiento")}
                    </dt>
                    <dd>{releaseDate}</dd>
                  </div>
                  <div>
                    <dt>{tri(lang, "Gêneros", "Genres", "Géneros")}</dt>
                    <dd>
                      {game.searchFilters.genres.length
                        ? game.searchFilters.genres.map((item) => (
                            <span key={item.id}>
                              <Link href={`/${lang}/search?genres=${item.id}`}>
                                {item.name}
                              </Link>
                            </span>
                          ))
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {tri(lang, "Plataformas", "Platforms", "Plataformas")}
                    </dt>
                    <dd>
                      {game.searchFilters.platforms.length
                        ? game.searchFilters.platforms.map((item) => (
                            <span key={item.id}>
                              <Link
                                href={`/${lang}/search?platforms=${item.id}`}
                              >
                                {item.name}
                              </Link>
                            </span>
                          ))
                        : "—"}
                    </dd>
                  </div>
                  {game.developers.length > 0 && (
                    <div>
                      <dt>
                        {tri(
                          lang,
                          "Desenvolvimento",
                          "Developed by",
                          "Desarrollo",
                        )}
                      </dt>
                      <dd>
                        {game.searchFilters.developers.map((item) => (
                          <Link
                            className="game-detail-filter-link"
                            href={
                              item.slug
                                ? `/${lang}/company/${item.slug}`
                                : `/${lang}/search?publishers=${item.id}&role=developer`
                            }
                            key={item.id}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                  {game.publishers.length > 0 && (
                    <div>
                      <dt>
                        {tri(lang, "Publicação", "Published by", "Publicación")}
                      </dt>
                      <dd>
                        {/* With a slug the name goes to the company page;
                            without one there is nothing to show, so it falls
                            back to the catalogue filtered by that company. */}
                        {game.searchFilters.publishers.map((item) => (
                          <Link
                            className="game-detail-filter-link"
                            href={
                              item.slug
                                ? `/${lang}/company/${item.slug}`
                                : `/${lang}/search?publishers=${item.id}`
                            }
                            key={item.id}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                  {game.themes.length > 0 && (
                    <div>
                      <dt>{tri(lang, "Temas", "Themes", "Temas")}</dt>
                      <dd>
                        {game.searchFilters.themes.map((item) => (
                          <span key={item.id}>
                            <Link href={`/${lang}/search?themes=${item.id}`}>
                              {item.name}
                            </Link>
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {game.modes.length > 0 && (
                    <div>
                      <dt>{tri(lang, "Modos", "Modes", "Modos")}</dt>
                      <dd>
                        {game.searchFilters.modes.map((item) => (
                          <span key={item.id}>
                            <Link href={`/${lang}/search?modes=${item.id}`}>
                              {item.name}
                            </Link>
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {game.engines.length > 0 && (
                    <div>
                      <dt>{tri(lang, "Engine", "Engine", "Motor")}</dt>
                      <dd>
                        {game.searchFilters.engines.map((item) => (
                          <span key={item.id}>
                            <Link
                              href={`/${lang}/search?engines=${encodeURIComponent(item.name)}`}
                            >
                              {item.name}
                            </Link>
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
              {game.languages.length > 0 && (
                <section className="game-languages-panel game-surface">
                  <header className="game-panel-heading">
                    <h2>
                      {tri(
                        lang,
                        "Idiomas suportados",
                        "Supported languages",
                        "Idiomas compatibles",
                      )}
                    </h2>
                  </header>
                  <div className="game-language-table-wrap">
                    <table className="game-language-table">
                      <thead>
                        <tr>
                          <th scope="col">
                            {tri(lang, "Idioma", "Language", "Idioma")}
                          </th>
                          <th scope="col">Interface</th>
                          <th scope="col">
                            {tri(lang, "Áudio", "Audio", "Audio")}
                          </th>
                          <th scope="col">
                            {tri(lang, "Legendas", "Subtitles", "Subtítulos")}
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
                                    <span className="game-language-status">
                                      {supported ? (
                                        <Check size={14} aria-hidden />
                                      ) : (
                                        <span aria-hidden>—</span>
                                      )}
                                    </span>
                                    <span className="sr-only">
                                      {supported
                                        ? tri(
                                            lang,
                                            "Disponível",
                                            "Available",
                                            "Disponible",
                                          )
                                        : tri(
                                            lang,
                                            "Indisponível",
                                            "Unavailable",
                                            "No disponible",
                                          )}
                                    </span>
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
              {ageRatings.length > 0 && (
                <section className="game-age-panel game-surface">
                  <header>
                    <ShieldCheck size={16} aria-hidden />
                    <div>
                      <span>
                        {tri(
                          lang,
                          "CLASSIFICAÇÃO",
                          "AGE RATING",
                          "CLASIFICACIÓN",
                        )}
                      </span>
                      <h2>
                        {tri(
                          lang,
                          "Faixa etária",
                          "Content rating",
                          "Clasificación por edad",
                        )}
                      </h2>
                    </div>
                  </header>
                  <div className="game-age-ratings">
                    {ageRatings.slice(0, 3).map((rating) => (
                      <div key={`${rating.organization}-${rating.rating}`}>
                        <span className="game-age-rating-mark">
                          {rating.imageUrl ? (
                            <Image
                              src={rating.imageUrl}
                              alt={`${rating.organization}: ${rating.rating}`}
                              width={72}
                              height={72}
                            />
                          ) : (
                            <strong>{rating.rating}</strong>
                          )}
                        </span>
                        <span>
                          <strong>{rating.rating}</strong>
                          <small>
                            {rating.organization} · {rating.region}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                  <p>
                    {tri(
                      lang,
                      "Classificações informadas pela IGDB.",
                      "Ratings provided by IGDB.",
                      "Clasificaciones proporcionadas por IGDB.",
                    )}
                  </p>
                </section>
              )}
              <section className="game-time-panel game-surface">
                <header>
                  <Clock3 size={16} />
                  <div>
                    <span>{tri(lang, "DURAÇÃO", "PLAYTIME", "DURACIÓN")}</span>
                    <h2>
                      {tri(
                        lang,
                        "Tempo para zerar",
                        "Time to beat",
                        "Tiempo para completarlo",
                      )}
                    </h2>
                  </div>
                </header>
                <dl>
                  <div>
                    <dt>
                      <Gauge size={13} />
                      {tri(lang, "Campanha", "Main story", "Campaña")}
                    </dt>
                    <dd>{duration(game.timeToBeat?.hastily ?? null)}</dd>
                  </div>
                  <div>
                    <dt>
                      <Play size={13} />
                      {tri(lang, "Com extras", "With extras", "Con extras")}
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
                    {tri(
                      lang,
                      "registros no IGDB",
                      "IGDB submissions",
                      "registros en IGDB",
                    )}
                  </p>
                ) : (
                  <p>
                    {tri(
                      lang,
                      "Duração ainda não disponível na IGDB.",
                      "Playtime is not available on IGDB yet.",
                      "La duración todavía no está disponible en IGDB.",
                    )}
                  </p>
                )}
              </section>
              {similarGames.length > 0 && (
                <section className="game-similar-rail game-surface">
                  <header>
                    <h2>
                      {tri(
                        lang,
                        "Jogos similares",
                        "Similar games",
                        "Juegos similares",
                      )}
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
                <h2>{tri(lang, "Comunidade", "Community", "Comunidad")}</h2>
              </div>
            </div>
            <Suspense
              fallback={
                <div className="skeleton-stream" aria-hidden>
                  <div className="skeleton-block skeleton-title" />
                  <div className="skeleton-block skeleton-subtitle" />
                </div>
              }
            >
              <GameCommunityStream
                gameId={game.id}
                lang={lang}
                viewerId={user?.id}
              />
            </Suspense>
          </section>
        }
      />
    </main>
  );
}
