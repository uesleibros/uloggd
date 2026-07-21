import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight, Info, Star } from "lucide-react";
import { HomeSkeleton } from "@/components/home-skeleton";
import {
  getDiscoveryGames,
  getGenreCollections,
  getPopularGames,
  type Game,
} from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { resolveGameCover } from "@/lib/game-cover";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { ShelfCarousel } from "@/components/shelf-carousel";
import { getDictionary, hasLocale } from "./dictionaries";
import type { UiLang } from "@/lib/ui-text";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent lang={lang} />
    </Suspense>
  );
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
          ? `${game.hype.toLocaleString(lang)} ${lang === "pt-BR" ? "interessados" : "following"}`
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
  const snapshot = user
    ? await (async () => {
        const supabase = await getSupabase();
        const [saved, library, playing, rated] = await Promise.all([
          supabase
            .from("user_games")
            .select(
              "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
            )
            .eq("profile_id", user.id)
            .in("igdb_id", [...visibleGameIds]),
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
                {lang === "pt-BR"
                  ? "DESTAQUE DO CATÁLOGO"
                  : "CATALOG SPOTLIGHT"}
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
                  {lang === "pt-BR" ? "Ver jogo" : "View game"}
                </Link>
                <a href="#popular-catalog">
                  {lang === "pt-BR" ? "Explorar catálogo" : "Explore catalog"}
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
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
              {lang === "pt-BR" ? "NAVEGUE POR GÊNERO" : "BROWSE BY GENRE"}
            </span>
            <h2>
              {lang === "pt-BR"
                ? "Encontre seu próximo mundo"
                : "Find your next world"}
            </h2>
            <p>
              {lang === "pt-BR"
                ? "Coleções vivas do catálogo, organizadas pelo tipo de experiência."
                : "Living catalog collections organized by the kind of experience."}
            </p>
          </div>
          <div className="genre-collections">
            {uniqueGenreCollections.map((collection) => (
              <section className="genre-collection" key={collection.id}>
                <div className="section-heading">
                  <div>
                    <h3>{collection.name[lang]}</h3>
                    <p>
                      {lang === "pt-BR"
                        ? `${collection.games.length} escolhas populares`
                        : `${collection.games.length} popular picks`}
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
              <span>{lang === "pt-BR" ? "SUA JORNADA" : "YOUR JOURNEY"}</span>
              <h2>
                {lang === "pt-BR"
                  ? "Continue de onde parou"
                  : "Pick up where you left off"}
              </h2>
              <p>
                {lang === "pt-BR"
                  ? "Sua coleção e suas avaliações, reunidas em um só lugar."
                  : "Your collection and ratings, together in one place."}
              </p>
              <dl className="rail-library-stats">
                <div>
                  <dt>{lang === "pt-BR" ? "Jogos" : "Games"}</dt>
                  <dd>{libraryCount}</dd>
                </div>
                <div>
                  <dt>{lang === "pt-BR" ? "Jogando" : "Playing"}</dt>
                  <dd>{playingCount}</dd>
                </div>
                <div>
                  <dt>{lang === "pt-BR" ? "Avaliados" : "Rated"}</dt>
                  <dd>{ratedCount}</dd>
                </div>
              </dl>
              <Link className="rail-primary-action" href={`/${lang}/library`}>
                {lang === "pt-BR" ? "Abrir biblioteca" : "Open library"}
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
