import { Suspense } from "react";
import { getLibraryCards } from "@/lib/library-state";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Compass } from "lucide-react";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { ShelfCarousel } from "@/components/shelf-carousel";
import {
  ViewerShelves,
  ViewerDiscoveryShelves,
} from "@/components/home/viewer-shelves";
import { CommunityFeed } from "@/components/home/community-feed";
import { HomeGameShelf } from "@/components/home/home-game-shelf";
import { ShelfSkeleton } from "@/components/home/shelf-skeleton";
import { ViewerEmptyLibrary } from "@/components/home/viewer-library-summary";
import { getCommunityGameRatings } from "@/lib/community-ratings";
import { getDiscoveryGames, getPopularGames, type Game } from "@/lib/igdb";
import { socialMetadata } from "@/lib/seo";
import { getAuthUser } from "@/lib/supabase/auth";
import { tri, type UiLang } from "@/lib/ui-text";
import { getDictionary, hasLocale } from "./dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dictionary = await getDictionary(lang);
  const title = tri(
    lang,
    "Diário e comunidade de jogos",
    "Game journal and community",
    "Diario y comunidad de juegos",
  );
  return {
    title: { absolute: `${title} · uloggd` },
    description: dictionary.home.subtitle,
    ...socialMetadata({
      lang,
      path: "/",
      title,
      description: dictionary.home.subtitle,
    }),
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <HomeContent lang={lang} />;
}

async function HomeContent({ lang }: { lang: UiLang }) {
  // The frame waits on the dictionary and on who is asking, and on nothing
  // else. Everything under it either fetches itself from the browser or streams
  // in behind a Suspense boundary, so the page is on screen and legible while
  // its slowest read is still running.
  const [d, user] = await Promise.all([getDictionary(lang), getAuthUser()]);

  // Started here and awaited in two places below. One read, two shelves, and
  // this function does not wait for either.
  const catalogue = loadCatalogue(lang, d, user?.id ?? null);

  // `/library` with no username is the shortcut that forwards to the viewer's
  // own, so this no longer waits on a read to know where it points.
  const libraryHref = `/${lang}/library`;

  return (
    <div className="home-shell home-community-shell">
      <main className="feed home-community-main">
        <header className="home-community-intro">
          <div>
            <h1>{tri(lang, "Comunidade", "Community", "Comunidad")}</h1>
            <p>
              {tri(
                lang,
                "Veja o que seus amigos estão jogando, leia avaliações recentes e continue seu próprio diário.",
                "See what friends are playing, read recent reviews, and keep your own journal moving.",
                "Mira qué juegan tus amigos, lee reseñas recientes y continúa tu propio diario.",
              )}
            </p>
          </div>
          <div className="home-community-actions">
            <Link href={`/${lang}/search`}>
              <Compass size={16} />
              {tri(lang, "Encontrar um jogo", "Find a game", "Buscar un juego")}
            </Link>
            {/* What the right-hand column used to say, where the eye already
                is. The column is gone so the community gets the width: its
                trending list repeated the "most logged" shelf further down,
                and its library pitch is this link. */}
            {user ? (
              <Link href={libraryHref}>
                {tri(lang, "Minha biblioteca", "My library", "Mi biblioteca")}
                <ArrowRight size={15} />
              </Link>
            ) : (
              <Link href={`/${lang}/login?next=/${lang}`}>
                {d.actions.buildLibrary}
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </header>

        {/* Exactly where the shelves that need a library would be, so the
            answer sits in the hole rather than somewhere else on the page. */}
        <ViewerEmptyLibrary lang={lang} viewerId={user?.id ?? null} />

        {/* Before the community shelves on purpose. Nineteen people keep a
            library here and half of them follow nobody, so what is already in
            somebody's own library is the likeliest thing on this page to be
            worth their time. */}
        {/* Play next, friends playing and the taste neighbours, all asked
            for from the browser. None of it is indexable and none of it is the
            same for two visitors, so holding the document open for it only made
            the page slower for everybody. Each one holds its own place. */}
        <ViewerShelves lang={lang} viewerId={user?.id ?? null} />

        {/* The community feed, asked for from the browser. Every review,
            log and screenshot in it has its own page, and those are the pages
            search engines index; a rolling list of the newest few is not
            something anybody reaches from a search result, so it does not need
            to be in the document. */}
        <CommunityFeed lang={lang} viewerId={user?.id ?? null} />

        {/* Public catalogue, the same for everybody, so it stays in the
            document where a crawler can read it. Behind Suspense it no longer
            holds the rest of the page hostage while IGDB answers. */}
        <Suspense
          fallback={
            <section className="discoveries-section home-discoveries-section">
              <div className="discoveries-heading">
                <div>
                  <h2>{d.home.discoveries}</h2>
                  <p>{d.home.discoveriesDescription}</p>
                </div>
              </div>
              <ShelfSkeleton layout="covers" count={8} />
            </section>
          }
        >
          <DiscoveryLanes lang={lang} d={d} catalogue={catalogue} />
        </Suspense>

        <ViewerDiscoveryShelves
          lang={lang}
          viewerId={user?.id ?? null}
          labels={{
            recentlyViewed: tri(
              lang,
              "Vistos recentemente",
              "Recently viewed",
              "Vistos recientemente",
            ),
            recentlyViewedDescription: "",
            forYou: tri(lang, "Pra você", "For you", "Para ti"),
            forYouDescription: "",
          }}
        />

        <Suspense
          fallback={
            <section className="library-section home-catalog-shelf">
              <div className="section-heading">
                <div>
                  <h2>{d.home.mostLogged}</h2>
                  <p>{d.home.mostLoggedDescription}</p>
                </div>
              </div>
              <ShelfSkeleton layout="covers" count={5} />
            </section>
          }
        >
          <PopularShelf lang={lang} d={d} catalogue={catalogue} />
        </Suspense>
      </main>
    </div>
  );
}

/**
 * Everything the public shelves need, read once.
 *
 * The chain is unavoidable: the catalogue comes from IGDB, the ids come from the
 * catalogue, and the viewer's own state for those ids comes from us. What is
 * avoidable is making the page wait for it, which is why this is started without
 * being awaited and handed to the two shelves that consume it.
 */
async function loadCatalogue(
  lang: UiLang,
  d: Awaited<ReturnType<typeof getDictionary>>,
  viewerId: string | null,
) {
  const [games, discoveries] = await Promise.all([
    getPopularGames(),
    getDiscoveryGames(),
  ]);
  const popularGames = games.slice(0, 10);

  const taken = new Set<number>();
  const takeDiscoveryGames = (source: Game[], limit: number) => {
    const result: Game[] = [];
    for (const game of source) {
      if (taken.has(game.id)) continue;
      taken.add(game.id);
      result.push(game);
      if (result.length === limit) break;
    }
    return result;
  };
  const laneGames = {
    anticipated: takeDiscoveryGames(discoveries.anticipated, 8),
    upcoming: takeDiscoveryGames(discoveries.upcoming, 8),
    hiddenGems: takeDiscoveryGames(discoveries.hiddenGems, 8),
  };

  const visibleGameIds = [
    ...new Set([
      ...popularGames.map((game) => game.id),
      ...Object.values(laneGames).flatMap((lane) =>
        lane.map((game) => game.id),
      ),
    ]),
  ];
  const [snapshot, communityRatings] = await Promise.all([
    viewerId
      ? getLibraryCards(visibleGameIds).then((result) => result.data)
      : Promise.resolve([]),
    getCommunityGameRatings(visibleGameIds),
  ]);
  const savedById = new Map(snapshot.map((item) => [item.igdb_id, item]));

  const releaseFormatter = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const discoveryLanes = [
    {
      key: "anticipated",
      title: d.home.mostAnticipated,
      description: d.home.mostAnticipatedDescription,
      games: laneGames.anticipated,
      meta: (game: Game) =>
        game.hype
          ? `${game.hype.toLocaleString(lang)} ${tri(lang, "interessados", "following", "interesados")}`
          : d.home.releaseDatePending,
    },
    {
      key: "upcoming",
      title: d.home.comingSoon,
      description: d.home.comingSoonDescription,
      games: laneGames.upcoming,
      meta: (game: Game) =>
        game.releaseTimestamp
          ? releaseFormatter.format(new Date(game.releaseTimestamp * 1000))
          : d.home.releaseDatePending,
    },
    {
      key: "hidden-gems",
      title: d.home.hiddenGems,
      description: d.home.hiddenGemsDescription,
      games: laneGames.hiddenGems,
      meta: (game: Game) =>
        communityRatings.has(game.id)
          ? `${communityRatings.get(game.id)!.rating}/100 · ${communityRatings.get(game.id)!.count.toLocaleString(lang)} ${tri(lang, "avaliações no uloggd", "ratings on uloggd", "valoraciones en uloggd")}`
          : typeof game.rating === "number"
            ? `IGDB ${Math.round(game.rating)}/100`
            : d.home.releaseDatePending,
    },
  ].filter((lane) => lane.games.length > 0);

  return {
    popularGames,
    discoveryLanes,
    savedById,
    communityRatings,
    signedIn: Boolean(viewerId),
  };
}

type Catalogue = ReturnType<typeof loadCatalogue>;

async function DiscoveryLanes({
  lang,
  d,
  catalogue,
}: {
  lang: UiLang;
  d: Awaited<ReturnType<typeof getDictionary>>;
  catalogue: Catalogue;
}) {
  const { discoveryLanes, savedById, signedIn } = await catalogue;
  if (!discoveryLanes.length) return null;
  return (
    <section
      className="discoveries-section home-discoveries-section"
      aria-labelledby="home-discoveries-title"
    >
      <div className="discoveries-heading">
        <div>
          <h2 id="home-discoveries-title">{d.home.discoveries}</h2>
          <p>{d.home.discoveriesDescription}</p>
        </div>
      </div>
      <div className="discovery-lanes">
        {discoveryLanes.map((lane) => (
          <section className="discovery-lane" key={lane.key}>
            <header>
              <div>
                <h3>{lane.title}</h3>
                <p>{lane.description}</p>
              </div>
            </header>
            <ShelfCarousel
              label={lane.title}
              lang={lang}
              className="discovery-games"
              autoPlay
            >
              {lane.games.map((game) => (
                <QuickGameCard
                  key={game.id}
                  game={game}
                  initial={savedById.get(game.id) ?? null}
                  lang={lang}
                  enabled={signedIn}
                  meta={lane.meta(game)}
                />
              ))}
            </ShelfCarousel>
          </section>
        ))}
      </div>
    </section>
  );
}

async function PopularShelf({
  lang,
  d,
  catalogue,
}: {
  lang: UiLang;
  d: Awaited<ReturnType<typeof getDictionary>>;
  catalogue: Catalogue;
}) {
  const { popularGames, savedById, signedIn } = await catalogue;
  return (
    <HomeGameShelf
      title={d.home.mostLogged}
      description={d.home.mostLoggedDescription}
      games={popularGames}
      savedById={savedById}
      lang={lang}
      enabled={signedIn}
      ranked
    />
  );
}
