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
import { getPopularGames } from "@/lib/igdb";
import { getDictionary, hasLocale } from "./dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [d, games] = await Promise.all([
    getDictionary(lang),
    getPopularGames(),
  ]);
  const [featured, ...catalog] = games;
  const date = new Intl.DateTimeFormat(lang, {
    day: "2-digit",
    month: "short",
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date())
    .toUpperCase();

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
              <article className="shelf-game" key={game.id}>
                <div className="shelf-cover">
                  <Image
                    src={game.coverUrl}
                    alt={`${game.name} cover`}
                    fill
                    sizes="(max-width: 620px) 42vw, 120px"
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <button aria-label={`${d.actions.save}: ${game.name}`}>
                    <Bookmark size={15} />
                  </button>
                </div>
                <h3>{game.name}</h3>
                <p>
                  {game.releaseYear} · {game.genres[0]}
                </p>
              </article>
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
        <footer>
          <span>© 2026 uloggd · {d.platform.gameData}</span>
          <nav>
            <Link href={`/${lang}/legal/terms`}>{d.legal.terms}</Link>
            <Link href={`/${lang}/legal/privacy`}>{d.legal.privacy}</Link>
            <Link href={`/${lang}/legal/child-safety`}>{d.legal.safety}</Link>
          </nav>
        </footer>
      </aside>
    </div>
  );
}
