import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Gamepad2,
  MessagesSquare,
  Star,
} from "lucide-react";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { ShelfCarousel } from "@/components/shelf-carousel";
import { ActivityStream } from "@/components/social/activity-stream";
import { VerifiedBadge } from "@/components/verified-badge";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { getProfileLevels } from "@/lib/profile-level";
import { getHomePersonalization } from "@/lib/history";
import { getCommunityGameRatings } from "@/lib/community-ratings";
import { getDiscoveryGames, getPopularGames, type Game } from "@/lib/igdb";
import { getActivity, getFollowingIds, getFriendsPlaying } from "@/lib/social";
import { localeAlternates } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { tri, type UiLang } from "@/lib/ui-text";
import { getDictionary, hasLocale } from "./dictionaries";

type SavedGameState = {
  status:
    "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
};

export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: {
      absolute: tri(
        lang,
        "Diário e comunidade de jogos · uloggd",
        "Game journal and community · uloggd",
        "Diario y comunidad de juegos · uloggd",
      ),
    },
    alternates: localeAlternates(lang, "/"),
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <HomeContent lang={lang} />;
}

async function HomeContent({ lang }: { lang: UiLang }) {
  const [d, games, discoveries, user, supabase] = await Promise.all([
    getDictionary(lang),
    getPopularGames(),
    getDiscoveryGames(),
    getAuthUser(),
    getSupabase(),
  ]);
  const followingPromise = user
    ? getFollowingIds(supabase, user.id)
    : Promise.resolve([]);
  const personalizationPromise = user
    ? getHomePersonalization(supabase, user.id)
    : Promise.resolve({ recentlyViewed: [], forYou: [] });
  const communityPromise = getActivity(supabase, {
    viewerId: user?.id ?? null,
    limit: 18,
  });
  const friendsPlayingPromise = user
    ? followingPromise.then((following) =>
        getFriendsPlaying(supabase, following, 10),
      )
    : Promise.resolve([]);
  const personalization = await personalizationPromise;
  const { recentlyViewed, forYou } = personalization;
  const popularGames = games.slice(0, 10);
  const discoveryIds = new Set<number>();
  const takeDiscoveryGames = (source: Game[], limit: number) => {
    const result: Game[] = [];
    for (const game of source) {
      if (discoveryIds.has(game.id)) continue;
      discoveryIds.add(game.id);
      result.push(game);
      if (result.length === limit) break;
    }
    return result;
  };
  const releaseFormatter = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  let communityRatings = new Map<number, { rating: number; count: number }>();
  const discoveryLanes = [
    {
      key: "anticipated",
      title: d.home.mostAnticipated,
      description: d.home.mostAnticipatedDescription,
      games: takeDiscoveryGames(discoveries.anticipated, 8),
      meta: (game: Game) =>
        game.hype
          ? `${game.hype.toLocaleString(lang)} ${tri(lang, "interessados", "following", "interesados")}`
          : d.home.releaseDatePending,
    },
    {
      key: "upcoming",
      title: d.home.comingSoon,
      description: d.home.comingSoonDescription,
      games: takeDiscoveryGames(discoveries.upcoming, 8),
      meta: (game: Game) =>
        game.releaseTimestamp
          ? releaseFormatter.format(new Date(game.releaseTimestamp * 1000))
          : d.home.releaseDatePending,
    },
    {
      key: "hidden-gems",
      title: d.home.hiddenGems,
      description: d.home.hiddenGemsDescription,
      games: takeDiscoveryGames(discoveries.hiddenGems, 8),
      meta: (game: Game) =>
        communityRatings.has(game.id)
          ? `${communityRatings.get(game.id)!.rating}/100 · ${communityRatings.get(game.id)!.count.toLocaleString(lang)} ${tri(lang, "avaliações no uloggd", "ratings on uloggd", "valoraciones en uloggd")}`
          : typeof game.rating === "number"
            ? `IGDB ${Math.round(game.rating)}/100`
            : d.home.releaseDatePending,
    },
  ].filter((lane) => lane.games.length > 0);
  const visibleGameIds = [
    ...new Set([
      ...popularGames.map((game) => game.id),
      ...recentlyViewed.map((game) => game.id),
      ...forYou.map((game) => game.id),
      ...discoveryLanes.flatMap((lane) => lane.games.map((game) => game.id)),
    ]),
  ];
  const snapshotPromise = user
    ? (async () => {
        const [saved, library, playing, rated, profile] = await Promise.all([
          visibleGameIds.length
            ? supabase
                .from("user_games")
                .select(
                  "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
                )
                .eq("profile_id", user.id)
                .in("igdb_id", visibleGameIds)
            : Promise.resolve({ data: [] }),
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
          supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle(),
        ]);
        return {
          savedGames: saved.data ?? [],
          libraryCount: library.count ?? 0,
          playingCount: playing.count ?? 0,
          ratedCount: rated.count ?? 0,
          username: profile.data?.username ?? null,
        };
      })()
    : Promise.resolve(null);
  const communityRatingsPromise = getCommunityGameRatings(
    supabase,
    visibleGameIds,
  );
  const [communityEntries, friendsPlaying, snapshot, communityRatingResult] =
    await Promise.all([
      communityPromise,
      friendsPlayingPromise,
      snapshotPromise,
      communityRatingsPromise,
    ]);
  communityRatings = communityRatingResult;
  // One call for every author on the shelf rather than one per card.
  const levels = await getProfileLevels(
    supabase,
    friendsPlaying.map((item) => item.profileId),
  );
  const savedById = new Map(
    (snapshot?.savedGames ?? []).map((item) => [item.igdb_id, item]),
  );
  const reviews = communityEntries
    .filter((entry) => entry.kind === "review")
    .slice(0, 4);
  const communityUpdates = communityEntries
    .filter((entry) => entry.kind !== "review")
    .slice(0, 6);
  const libraryHref = snapshot?.username
    ? `/${lang}/library/${snapshot.username}`
    : `/${lang}/library`;

  return (
    <div className="home-shell home-community-shell">
      <main className="feed home-community-main">
        <header className="home-community-intro">
          <div>
            <span>
              <MessagesSquare size={14} />
              {tri(
                lang,
                "AGORA NA COMUNIDADE",
                "NOW IN THE COMMUNITY",
                "AHORA EN LA COMUNIDAD",
              )}
            </span>
            <h1>
              {tri(
                lang,
                "Jogos ficam melhores quando viram conversa.",
                "Games get better when they become a conversation.",
                "Los juegos mejoran cuando se convierten en conversación.",
              )}
            </h1>
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
            {user && (
              <Link href={libraryHref}>
                {tri(lang, "Minha biblioteca", "My library", "Mi biblioteca")}
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </header>

        {friendsPlaying.length > 0 && (
          <section
            className="home-playing-section"
            aria-labelledby="playing-now-title"
          >
            <div className="home-section-heading">
              <div>
                <span>{tri(lang, "AO VIVO", "LIVE", "EN VIVO")}</span>
                <h2 id="playing-now-title">
                  {tri(
                    lang,
                    "Amigos jogando agora",
                    "Friends playing now",
                    "Amigos jugando ahora",
                  )}
                </h2>
              </div>
            </div>
            <ShelfCarousel
              label={tri(
                lang,
                "Amigos jogando agora",
                "Friends playing now",
                "Amigos jugando ahora",
              )}
              lang={lang}
              className="home-playing-carousel"
              autoPlay
            >
              {friendsPlaying.map((item) => (
                <article key={`${item.profileId}:${item.game.id}`}>
                  <Link
                    className="home-playing-cover"
                    href={`/${lang}/game/${item.game.slug}`}
                  >
                    <Image src={item.game.coverUrl} alt="" fill sizes="112px" />
                  </Link>
                  <div className="home-playing-person">
                    <Link
                      className="home-playing-avatar"
                      href={`/${lang}/u/${item.username}`}
                    >
                      {item.avatarUrl ? (
                        <Image
                          src={item.avatarUrl}
                          alt=""
                          fill
                          sizes="28px"
                          unoptimized
                        />
                      ) : (
                        (item.displayName || item.username)
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </Link>
                    <span>
                      {/* The marks are siblings of the link, not children of
                          it: the level is a button, and a button inside an
                          anchor is invalid and would fight it for the click. */}
                      <span className="home-playing-identity">
                        <Link href={`/${lang}/u/${item.username}`}>
                          {item.displayName || `@${item.username}`}
                        </Link>
                        {levels.get(item.profileId) && (
                          <ProfileLevelBadge
                            lang={lang}
                            standing={levels.get(item.profileId)!}
                            username={item.username}
                          />
                        )}
                        {item.verified && (
                          <VerifiedBadge
                            lang={lang}
                            profileId={item.profileId}
                          />
                        )}
                      </span>
                      <Link href={`/${lang}/game/${item.game.slug}`}>
                        {item.game.name}
                      </Link>
                    </span>
                  </div>
                </article>
              ))}
            </ShelfCarousel>
          </section>
        )}

        <section
          className="home-reviews-section"
          aria-labelledby="community-reviews-title"
        >
          <div className="home-section-heading">
            <div>
              <span>{tri(lang, "CRÍTICA", "CRITIQUE", "CRÍTICA")}</span>
              <h2 id="community-reviews-title">
                {tri(
                  lang,
                  "Avaliações recentes",
                  "Recent reviews",
                  "Reseñas recientes",
                )}
              </h2>
            </div>
          </div>
          {reviews.length > 0 ? (
            <ActivityStream
              entries={reviews}
              lang={lang}
              viewerId={user?.id ?? null}
            />
          ) : (
            <div className="home-community-empty">
              <Star size={18} />
              <p>
                {tri(
                  lang,
                  "As próximas avaliações públicas da comunidade aparecem aqui.",
                  "The community's next public reviews will appear here.",
                  "Las próximas reseñas públicas de la comunidad aparecerán aquí.",
                )}
              </p>
            </div>
          )}
        </section>

        <section
          className="home-activity-section"
          aria-labelledby="community-updates-title"
        >
          <div className="home-section-heading">
            <div>
              <span>{tri(lang, "DIÁRIO", "JOURNAL", "DIARIO")}</span>
              <h2 id="community-updates-title">
                {tri(
                  lang,
                  "Últimos registros da comunidade",
                  "Latest community logs",
                  "Últimos registros de la comunidad",
                )}
              </h2>
            </div>
          </div>
          <ActivityStream
            entries={communityUpdates}
            lang={lang}
            viewerId={user?.id ?? null}
          />
        </section>

        {discoveryLanes.length > 0 && (
          <section
            className="discoveries-section home-discoveries-section"
            aria-labelledby="home-discoveries-title"
          >
            <div className="discoveries-heading">
              <span>
                {tri(lang, "NO RADAR", "ON THE RADAR", "EN EL RADAR")}
              </span>
              <div>
                <h2 id="home-discoveries-title">{d.home.discoveries}</h2>
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
                    autoPlay
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
        )}

        {user && recentlyViewed.length > 0 && (
          <HomeGameShelf
            title={tri(
              lang,
              "Vistos recentemente",
              "Recently viewed",
              "Vistos recientemente",
            )}
            games={recentlyViewed}
            savedById={savedById}
            lang={lang}
            enabled
          />
        )}

        {user && forYou.length > 0 && (
          <HomeGameShelf
            title={tri(lang, "Pra você", "For you", "Para ti")}
            games={forYou}
            savedById={savedById}
            lang={lang}
            enabled
          />
        )}

        <HomeGameShelf
          title={d.home.mostLogged}
          description={d.home.mostLoggedDescription}
          games={popularGames}
          savedById={savedById}
          lang={lang}
          enabled={Boolean(user)}
          ranked
        />
      </main>

      <aside className="right-rail home-community-rail">
        <section className="rail-intro">
          {user ? (
            <>
              <span>
                <Gamepad2 size={14} />
                {tri(lang, "SEU MOMENTO", "YOUR MOMENT", "TU MOMENTO")}
              </span>
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
                  <dd>{snapshot?.libraryCount ?? 0}</dd>
                </div>
                <div>
                  <dt>{tri(lang, "Jogando", "Playing", "Jugando")}</dt>
                  <dd>{snapshot?.playingCount ?? 0}</dd>
                </div>
                <div>
                  <dt>{tri(lang, "Avaliados", "Rated", "Valorados")}</dt>
                  <dd>{snapshot?.ratedCount ?? 0}</dd>
                </div>
              </dl>
              <Link className="rail-primary-action" href={libraryHref}>
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
                <Image src={game.coverUrl} alt="" fill sizes="38px" />
              </span>
              <div>
                <strong>{game.name}</strong>
                <small>
                  {communityRatings.has(game.id)
                    ? `${communityRatings.get(game.id)!.rating}/100 · ${communityRatings.get(game.id)!.count.toLocaleString(lang)} ${tri(lang, "avaliações", "ratings", "valoraciones")}`
                    : typeof game.rating === "number"
                      ? `IGDB ${Math.round(game.rating)}/100`
                      : tri(
                          lang,
                          "Sem nota da comunidade",
                          "No community score",
                          "Sin nota de la comunidad",
                        )}
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

function HomeGameShelf({
  title,
  description,
  games,
  savedById,
  lang,
  enabled,
  ranked = false,
}: {
  title: string;
  description?: string;
  games: Awaited<ReturnType<typeof getPopularGames>>;
  savedById: Map<number, SavedGameState>;
  lang: UiLang;
  enabled: boolean;
  ranked?: boolean;
}) {
  if (!games.length) return null;
  return (
    <section className="library-section home-catalog-shelf">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      <ShelfCarousel
        label={title}
        lang={lang}
        className="home-popular-carousel"
        autoPlay
      >
        {games.map((game, index) => (
          <QuickGameCard
            key={game.id}
            game={game}
            initial={savedById.get(game.id) ?? null}
            lang={lang}
            enabled={enabled}
            rank={ranked ? index + 1 : undefined}
          />
        ))}
      </ShelfCarousel>
    </section>
  );
}
