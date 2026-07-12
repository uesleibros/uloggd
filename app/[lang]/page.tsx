import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  LibraryBig,
  ListPlus,
  Star,
} from "lucide-react";
import { getDiscoveryGames, getPopularGames, type Game } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/server";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { getDictionary, hasLocale } from "./dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [d, games, discoveries, supabase] = await Promise.all([
    getDictionary(lang),
    getPopularGames(),
    getDiscoveryGames(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: savedGames } = user
    ? await supabase
        .from("user_games")
        .select(
          "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
        )
        .eq("profile_id", user.id)
    : { data: [] };
  const savedById = new Map(
    (savedGames ?? []).map((item) => [item.igdb_id, item]),
  );
  const [featured, ...catalog] = games;
  const date = new Intl.DateTimeFormat(lang, {
    day: "2-digit",
    month: "short",
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date())
    .toUpperCase();
  const releaseFormatter = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const discoveryLanes: {
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

  return (
    <div className="home-shell">
      <main className="feed">
        <header className="feed-header">
          <div>
            <span>{date}</span>
            <h1>{d.home.todayTitle}</h1>
          </div>
        </header>

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
            <div className="featured-cover">
              <Image
                src={featured.coverUrl}
                alt={`${featured.name} cover`}
                fill
                priority
                sizes="150px"
              />
            </div>
            <div className="featured-copy">
              <h2>{featured.name}</h2>
              <div className="featured-meta">
                <span>
                  <Star size={13} fill="currentColor" />
                  {featured.rating ?? "—"}
                </span>
                <span>{featured.releaseYear}</span>
                <span>{featured.genres.join(" · ")}</span>
              </div>
              <p>{featured.summary || d.home.subtitle}</p>
              <div className="featured-actions">
                <button>
                  <LibraryBig size={17} />
                  {d.actions.wantToPlay}
                </button>
                <button aria-label={d.actions.save}>
                  <Bookmark size={18} />
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="library-section">
          <div className="section-heading">
            <div>
              <h2>{d.home.mostLogged}</h2>
              <p>{d.home.mostLoggedDescription}</p>
            </div>
            <Link href={`/${lang}`}>
              {d.actions.seeAll}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="cover-shelf">
            {catalog.slice(0, 5).map((game, index) => (
              <QuickGameCard
                key={game.id}
                game={game}
                initial={savedById.get(game.id) ?? null}
                lang={lang}
                rank={index + 1}
                enabled={Boolean(user)}
              />
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
                <div className="discovery-games">
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
                </div>
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
            {catalog.slice(5, 9).map((game) => (
              <article className="game-list-row" key={game.id}>
                <div className="list-cover">
                  <Image src={game.coverUrl} alt="" fill sizes="48px" />
                </div>
                <div className="list-main">
                  <h3>{game.name}</h3>
                  <p>
                    {[game.releaseYear, ...game.genres]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="list-rating">
                  <Star size={12} fill="currentColor" />
                  <strong>{game.rating ?? "—"}</strong>
                  <span>{game.ratingCount.toLocaleString(lang)}</span>
                </div>
                <button aria-label={`${d.actions.addGame}: ${game.name}`}>
                  <ListPlus size={18} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="right-rail">
        <section className="rail-intro">
          <h2>{d.home.libraryPitch}</h2>
          <p>{d.home.libraryPitchDescription}</p>
          <button>
            {d.actions.buildLibrary}
            <ArrowUpRight size={15} />
          </button>
        </section>
        <section className="rail-section">
          <div className="rail-title">
            <h2>{d.home.trending}</h2>
            <span>{d.home.trendingPeriod}</span>
          </div>
          {games.slice(0, 5).map((game, index) => (
            <Link href={`/${lang}`} className="trend" key={game.id}>
              <span>{index + 1}</span>
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
