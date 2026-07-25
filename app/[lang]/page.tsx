import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Info, Star } from "lucide-react";
import {
  getDiscoveryGames,
  getGenreCollections,
  getPopularGames,
  type Game,
} from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getForYouGames, getRecentlyViewedGames } from "@/lib/history";
import { resolveGameCover } from "@/lib/game-cover";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { ShelfCarousel } from "@/components/shelf-carousel";
import { localeAlternates } from "@/lib/seo";
import { getDictionary, hasLocale } from "./dictionaries";
import { tri, type UiLang } from "@/lib/ui-text";

export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  // The home page is the one place all three locales compete for the same
  // query, so it needs the hreflang set more than any other route.
  return { alternates: localeAlternates(lang, "/") };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  // loading.tsx já é o limite de Suspense desta rota e usa o mesmo skeleton;
  // um segundo aqui só duplicava o mesmo estado de carregamento.
  return <HomeContent lang={lang} />;
}

async function HomeContent({ lang }: { lang: UiLang }) {
  const [d, games, discoveries, genreCollections, user] = await Promise.all([
    getDictionary(lang),
    getPopularGames(),
    getDiscoveryGames(),
    getGenreCollections(),
    getAuthUser(),
  ]);
  const [featured, ...catalog] = games;
  const visibleGameIds = new Set<number>();
  if (featured) visibleGameIds.add(featured.id);
  const takeUnique = (source: Game[], limit: number) => {
    const unique: Game[] = [];
    for (const game of source) {
      if (visibleGameIds.has(game.id)) continue;
      visibleGameIds.add(game.id);
      unique.push(game);
      if (unique.length === limit) break;
    }
    return unique;
  };
  const distributeUniqueLanes = <T extends { games: Game[] }>(
    lanes: T[],
    limit: number,
  ) => {
    const cursors = lanes.map(() => 0);
    const allocated = lanes.map(() => [] as Game[]);
    for (let round = 0; round < limit; round += 1) {
      lanes.forEach((lane, laneIndex) => {
        while (cursors[laneIndex] < lane.games.length) {
          const game = lane.games[cursors[laneIndex]];
          cursors[laneIndex] += 1;
          if (visibleGameIds.has(game.id)) continue;
          visibleGameIds.add(game.id);
          allocated[laneIndex].push(game);
          break;
        }
      });
    }
    return lanes
      .map((lane, index) => ({ ...lane, games: allocated[index] }))
      .filter((lane) => lane.games.length > 0);
  };
  const popularGames = takeUnique(catalog, 10);
  const exploreGames = takeUnique(catalog, 4);
  const uniqueGenreCollections = distributeUniqueLanes(genreCollections, 10);
  const releaseFormatter = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const discoveryCandidates: {
    key: string;
    title: string;
    description: string;
    games: Game[];
    meta: (game: Game) => string;
  }[] = [
    {
      key: "anticipated",
      title: d.home.mostAnticipated,
      description: d.home.mostAnticipatedDescription,
      games: discoveries.anticipated,
      meta: (game) =>
        game.hype
          ? `${game.hype.toLocaleString(lang)} ${tri(lang, "interessados", "following", "interesados")}`
          : d.home.releaseDatePending,
    },
    {
      key: "upcoming",
      title: d.home.comingSoon,
      description: d.home.comingSoonDescription,
      games: discoveries.upcoming,
      meta: (game) =>
        game.releaseTimestamp
          ? releaseFormatter.format(new Date(game.releaseTimestamp * 1000))
          : d.home.releaseDatePending,
    },
    {
      key: "hidden-gems",
      title: d.home.hiddenGems,
      description: d.home.hiddenGemsDescription,
      games: discoveries.hiddenGems,
      meta: (game) =>
        game.rating
          ? `${game.rating}/100 · ${game.ratingCount.toLocaleString(lang)} ${d.home.registrations}`
          : d.home.releaseDatePending,
    },
  ];
  const discoveryLanes = distributeUniqueLanes(discoveryCandidates, 8);
  // Saved-state is only rendered for on-screen games and the counts come
  // from head-only count queries, so a large library never ships extra rows.
  const supabase = user ? await getSupabase() : null;
  const [recentlyViewed, forYou] =
    user && supabase
      ? await Promise.all([
          getRecentlyViewedGames(supabase, user.id, 12),
          getForYouGames(supabase, user.id),
        ])
      : [[] as Game[], [] as Game[]];
  const snapshot =
    user && supabase
      ? await (async () => {
        const [saved, library, playing, rated] = await Promise.all([
          supabase
            .from("user_games")
            .select(
              "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
            )
            .eq("profile_id", user.id)
            .in("igdb_id", [
              ...visibleGameIds,
              ...recentlyViewed.map((game) => game.id),
              ...forYou.map((game) => game.id),
            ]),
          supabase
            .from("user_games")
            .select("igdb_id", { count: "exact", head: true })
            .eq("profile_id", user.id),
          supabase
            .from("user_games")
            .select("igdb_id", { count: "exact", head: true })
            .eq("profile_id", user.id)
            .or("playing.eq.true,status.eq.PLAYING"),
          supabase
            .from("user_games")
            .select("igdb_id", { count: "exact", head: true })
            .eq("profile_id", user.id)
            .not("quick_rating", "is", null),
        ]);
        return {
          savedGames: saved.data ?? [],
          libraryCount: library.count ?? 0,
          playingCount: playing.count ?? 0,
          ratedCount: rated.count ?? 0,
        };
      })()
    : null;
  const savedById = new Map(
    (snapshot?.savedGames ?? []).map((item) => [item.igdb_id, item]),
  );
  const libraryCount = snapshot?.libraryCount ?? 0;
  const playingCount = snapshot?.playingCount ?? 0;
  const ratedCount = snapshot?.ratedCount ?? 0;

  return (
    <div className="home-shell">
      <main className="feed">
        {featured && (
          <section className="featured-game">
            <Image
              src={featured.heroUrl ?? featured.coverUrl}
              alt=""
              fill
              priority
              sizes="720px"
              className="featured-backdrop"
            />
            <div className="featured-scrim" />
            <div className="featured-copy">
              <span className="featured-kicker">
                {tri(
                  lang,
                  "DESTAQUE DO CATÁLOGO",
                  "CATALOG SPOTLIGHT",
                  "DESTACADO DEL CATÁLOGO",
                )}
              </span>
              <h2>
                <Link href={`/${lang}/game/${featured.slug}`}>
                  {featured.name}
                </Link>
              </h2>
              <div className="featured-meta">
                <span>
                  <Star size={13} fill="currentColor" />
                  {featured.rating ? `${featured.rating}/100` : "—"}
                </span>
                <span>{featured.releaseYear}</span>
                <span>{featured.genres.join(" · ")}</span>
              </div>
              <p>{featured.summary || d.home.subtitle}</p>
              <div className="featured-actions">
                <Link href={`/${lang}/game/${featured.slug}`}>
                  <Info size={17} />
                  {tri(lang, "Ver jogo", "View game", "Ver juego")}
                </Link>
                <a href="#popular-catalog">
                  {tri(
                    lang,
                    "Explorar catálogo",
                    "Explore catalog",
                    "Explorar catálogo",
                  )}
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </section>
        )}

        {user && recentlyViewed.length > 0 && (
          <section className="library-section">
            <div className="section-heading">
              <div>
                <h2>
                  {tri(
                    lang,
                    "Vistos recentemente",
                    "Recently viewed",
                    "Vistos recientemente",
                  )}
                </h2>
              </div>
            </div>
            <ShelfCarousel
              label={tri(
                lang,
                "Vistos recentemente",
                "Recently viewed",
                "Vistos recientemente",
              )}
              lang={lang}
            >
              {recentlyViewed.map((game) => (
                <QuickGameCard
                  key={game.id}
                  game={game}
                  initial={savedById.get(game.id) ?? null}
                  lang={lang}
                  enabled
                />
              ))}
            </ShelfCarousel>
          </section>
        )}

        {user && forYou.length > 0 && (
          <section className="library-section">
            <div className="section-heading">
              <div>
                <h2>{tri(lang, "Pra você", "For you", "Para ti")}</h2>
              </div>
            </div>
            <ShelfCarousel
              label={tri(lang, "Pra você", "For you", "Para ti")}
              lang={lang}
            >
              {forYou.map((game) => (
                <QuickGameCard
                  key={game.id}
                  game={game}
                  initial={savedById.get(game.id) ?? null}
                  lang={lang}
                  enabled
                  meta={game.rating ? `${game.rating}/100` : undefined}
                />
              ))}
            </ShelfCarousel>
          </section>
        )}

        <section className="library-section" id="popular-catalog">
          <div className="section-heading">
            <div>
              <h2>{d.home.mostLogged}</h2>
              <p>{d.home.mostLoggedDescription}</p>
            </div>
          </div>
          <ShelfCarousel
            label={d.home.mostLogged}
            lang={lang}
            className="home-popular-carousel"
          >
            {popularGames.map((game, index) => (
              <QuickGameCard
                key={game.id}
                game={game}
                initial={savedById.get(game.id) ?? null}
                lang={lang}
                rank={index + 1}
                enabled={Boolean(user)}
              />
            ))}
          </ShelfCarousel>
        </section>

        <section className="genre-section">
          <div className="genre-section-heading">
            <span>
              {tri(
                lang,
                "NAVEGUE POR GÊNERO",
                "BROWSE BY GENRE",
                "NAVEGA POR GÉNERO",
              )}
            </span>
            <h2>
              {tri(
                lang,
                "Encontre seu próximo mundo",
                "Find your next world",
                "Encuentra tu próximo mundo",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Coleções vivas do catálogo, organizadas pelo tipo de experiência.",
                "Living catalog collections organized by the kind of experience.",
                "Colecciones vivas del catálogo, organizadas por el tipo de experiencia.",
              )}
            </p>
          </div>
          <div className="genre-collections">
            {uniqueGenreCollections.map((collection) => (
              <section className="genre-collection" key={collection.id}>
                <div className="section-heading">
                  <div>
                    <h3>{collection.name[lang]}</h3>
                    <p>
                      {tri(
                        lang,
                        `${collection.games.length} escolhas populares`,
                        `${collection.games.length} popular picks`,
                        `${collection.games.length} elecciones populares`,
                      )}
                    </p>
                  </div>
                </div>
                <ShelfCarousel label={collection.name[lang]} lang={lang}>
                  {collection.games.map((game) => (
                    <QuickGameCard
                      key={game.id}
                      game={game}
                      initial={savedById.get(game.id) ?? null}
                      lang={lang}
                      enabled={Boolean(user)}
                      meta={game.rating ? `${game.rating}/100` : undefined}
                    />
                  ))}
                </ShelfCarousel>
              </section>
            ))}
          </div>
        </section>

        <section className="discoveries-section">
          <div className="discoveries-heading">
            <span>03 / DISCOVERY</span>
            <div>
              <h2>{d.home.discoveries}</h2>
              <p>{d.home.discoveriesDescription}</p>
            </div>
          </div>
          <div className="discovery-lanes">
            {discoveryLanes.map((lane, laneIndex) => (
              <section className="discovery-lane" key={lane.key}>
                <header>
                  <span>{String(laneIndex + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{lane.title}</h3>
                    <p>{lane.description}</p>
                  </div>
                </header>
                <ShelfCarousel
                  label={lane.title}
                  lang={lang}
                  className="discovery-games"
                >
                  {lane.games.map((game) => (
                    <QuickGameCard
                      key={game.id}
                      game={game}
                      initial={savedById.get(game.id) ?? null}
                      lang={lang}
                      enabled={Boolean(user)}
                      meta={lane.meta(game)}
                    />
                  ))}
                </ShelfCarousel>
              </section>
            ))}
          </div>
        </section>

        <section className="explore-section">
          <div className="section-heading">
            <div>
              <h2>{d.home.nextAdventure}</h2>
              <p>{d.home.nextAdventureDescription}</p>
            </div>
          </div>
          <div className="game-list">
            {exploreGames.map((game) => (
              <article className="game-list-row" key={game.id}>
                <Link
                  className="list-cover"
                  href={`/${lang}/game/${game.slug}`}
                >
                  <Image
                    src={resolveGameCover(
                      game.coverUrl,
                      savedById.get(game.id)?.custom_cover_url,
                    )}
                    alt=""
                    fill
                    sizes="48px"
                  />
                </Link>
                <Link className="list-main" href={`/${lang}/game/${game.slug}`}>
                  <h3>{game.name}</h3>
                  <p>
                    {[game.releaseYear, ...game.genres]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
                <div className="list-rating">
                  <Star size={12} fill="currentColor" />
                  <strong>{game.rating ?? "—"}</strong>
                  <span>{game.ratingCount.toLocaleString(lang)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="right-rail">
        <section className="rail-intro">
          {user ? (
            <>
              <h2>
                {tri(
                  lang,
                  "Continue de onde parou",
                  "Pick up where you left off",
                  "Continúa donde lo dejaste",
                )}
              </h2>
              <dl className="rail-library-stats">
                <div>
                  <dt>{tri(lang, "Jogos", "Games", "Juegos")}</dt>
                  <dd>{libraryCount}</dd>
                </div>
                <div>
                  <dt>{tri(lang, "Jogando", "Playing", "Jugando")}</dt>
                  <dd>{playingCount}</dd>
                </div>
                <div>
                  <dt>{tri(lang, "Avaliados", "Rated", "Valorados")}</dt>
                  <dd>{ratedCount}</dd>
                </div>
              </dl>
              <Link className="rail-primary-action" href={`/${lang}/library`}>
                {tri(
                  lang,
                  "Abrir biblioteca",
                  "Open library",
                  "Abrir biblioteca",
                )}
                <ArrowUpRight size={15} />
              </Link>
            </>
          ) : (
            <>
              <h2>{d.home.libraryPitch}</h2>
              <p>{d.home.libraryPitchDescription}</p>
              <Link
                className="rail-primary-action"
                href={`/${lang}/login?next=/${lang}`}
              >
                {d.actions.buildLibrary}
                <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </section>
        <section className="rail-section">
          <div className="rail-title">
            <h2>{d.home.trending}</h2>
            <span>{d.home.trendingPeriod}</span>
          </div>
          {games.slice(0, 5).map((game, index) => (
            <Link
              href={`/${lang}/game/${game.slug}`}
              className="trend"
              key={game.id}
            >
              <span>{index + 1}</span>
              <span className="trend-cover">
                <Image
                  src={resolveGameCover(
                    game.coverUrl,
                    savedById.get(game.id)?.custom_cover_url,
                  )}
                  alt=""
                  fill
                  sizes="38px"
                />
              </span>
              <div>
                <strong>{game.name}</strong>
                <small>
                  {game.ratingCount.toLocaleString(lang)} {d.home.registrations}
                </small>
              </div>
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </section>
      </aside>
    </div>
  );
}
