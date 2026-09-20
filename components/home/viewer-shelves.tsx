"use client";

import Image from "next/image";
import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { ShelfCarousel } from "@/components/shelf-carousel";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { PlayNextShelf } from "@/components/home/play-next-shelf";
import { TasteNeighboursShelf } from "@/components/home/taste-neighbours-shelf";
import { ShelfSkeleton } from "@/components/home/shelf-skeleton";
import { HomeGameShelf } from "@/components/home/home-game-shelf";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { VerifiedBadge } from "@/components/verified-badge";
import type { DiscoveryPeople } from "@/lib/discovery-types";
import type { PlayNextEntry } from "@/lib/play-next";
import type { LibrarySnapshot } from "@/lib/library-state";
import type { ProfileLevel } from "@/lib/profile-level";
import type { Game } from "@/lib/igdb";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Everything on the home page that exists only for the account looking at it.
 *
 * These used to be awaited on the server before the page sent a byte, and the
 * page was as slow as the slowest of them: a visitor watched a full-page
 * skeleton while five per-viewer reads finished, one of which had the other
 * four waiting on it. None of this is indexable and none of it is shared
 * between two visitors, so there is nothing to gain by holding the document
 * open for it. It is asked for from the browser, through our own API, and each
 * shelf holds its own place until its own answer lands.
 *
 * One component rather than five, because they share their reads: the friends
 * shelf and the neighbours shelf are two halves of one `/discovery/people`
 * answer, and the viewer's own state for all the games on show is one
 * `/library/cards` call rather than one per shelf.
 */
export function ViewerShelves({
  lang,
  viewerId,
}: {
  lang: UiLang;
  /** Null when nobody is signed in, which is when none of this applies. */
  viewerId: string | null;
}) {
  const signedIn = viewerId !== null;

  const people = useApi<DiscoveryPeople>(signedIn ? "/discovery/people" : null);
  const playNext = useApi<{
    data: { continuing: PlayNextEntry[]; queued: PlayNextEntry[] };
  }>(signedIn ? "/discovery/library" : null);
  const history = useApi<{ data: { recentlyViewed: Game[]; forYou: Game[] } }>(
    signedIn ? "/discovery/history" : null,
  );

  const friends = people.payload?.data.friends ?? [];
  const neighbours = people.payload?.data.neighbours ?? [];
  const levels = new Map(
    (people.payload?.data.levels ?? []).map((level) => [
      level.profile_id,
      level as ProfileLevel,
    ]),
  );
  const continuing = playNext.payload?.data.continuing ?? [];
  const queued = playNext.payload?.data.queued ?? [];
  const recentlyViewed = history.payload?.data.recentlyViewed ?? [];
  const forYou = history.payload?.data.forYou ?? [];

  // The viewer's own state for every game these shelves are about, so the quick
  // actions on a card open showing what is already set. Asked for once the game
  // ids are known, which is why it is a second call and not a wider first one.
  const shownGames = [
    ...new Set(
      [
        ...continuing.map((entry) => entry.game.id),
        ...queued.map((entry) => entry.game.id),
        ...friends.map((friend) => friend.game.id),
        ...recentlyViewed.map((game) => game.id),
        ...forYou.map((game) => game.id),
      ].filter((id) => id > 0),
    ),
  ].slice(0, 200);
  // The id list grows as each shelf lands, so this address changes two or
  // three times while the page fills in. The previous answer stays meanwhile:
  // without it every card on screen was handed "no state" between two reads,
  // and flickered to empty and back.
  const cards = useApi<LibrarySnapshot>(
    signedIn && shownGames.length
      ? `/library/cards?ids=${shownGames.join(",")}`
      : null,
    { keepPrevious: true },
  );
  const stateByGame = new Map(
    (cards.payload?.data ?? []).map((item) => [item.igdb_id, item]),
  );

  if (!signedIn) return null;

  return (
    <>
      {/* Before the community shelves on purpose. Nineteen people keep a
          library here and half of them follow nobody, so what is already in
          somebody's own library is the likeliest thing on this page to be worth
          their time. */}
      {playNext.loading ? (
        // A placeholder without a heading. Which shelves this account has is
        // exactly what is not known yet, and a title over a grey box promises a
        // shelf that an empty library never gets: the heading arrives with the
        // shelf, or neither does.
        <section className="home-playing-section">
          <ShelfSkeleton layout="covers" count={5} />
        </section>
      ) : (
        <>
          <PlayNextShelf
            id="play-next-continue"
            title={tri(lang, "Continuar jogando", "Pick back up", "Continuar")}
            entries={continuing}
            lang={lang}
            showIdleFor
          />
          <PlayNextShelf
            id="play-next-queue"
            title={tri(lang, "Da sua fila", "From your backlog", "De tu cola")}
            entries={queued}
            lang={lang}
          />
        </>
      )}

      {people.loading ? (
        <section className="home-playing-section">
          <ShelfSkeleton layout="covers" count={5} />
        </section>
      ) : (
        friends.length > 0 && (
          <section
            className="home-playing-section"
            aria-labelledby="playing-now-title"
          >
            <div className="home-section-heading">
              <div>
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
              {/* Keyed by the game alone: the shelf holds one card per game
                  now, and a compound key would only hide it if that broke. */}
              {friends.map((item) => (
                <article key={item.game.id}>
                  {/* The same card every other shelf on this page uses. It was
                      a hand-built cover with a bespoke menu over it, which is
                      a second card nobody asked for: the quick actions, the
                      cover fallback and the hover behaviour all already exist
                      here. */}
                  <QuickGameCard
                    game={item.game}
                    initial={stateByGame.get(item.game.id) ?? null}
                    lang={lang}
                    enabled
                  />
                  <div className="home-playing-person">
                    <Link
                      prefetch={false}
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
                        <Link
                          prefetch={false}
                          href={`/${lang}/u/${item.username}`}
                        >
                          {item.displayName || `@${item.username}`}
                        </Link>
                        {levels.get(item.profileId) && (
                          <ProfileLevelBadge
                            lang={lang}
                            standing={levels.get(item.profileId)!}
                          />
                        )}
                        {item.verified && (
                          <VerifiedBadge
                            lang={lang}
                            profileId={item.profileId}
                          />
                        )}
                      </span>
                    </span>
                  </div>
                </article>
              ))}
            </ShelfCarousel>
          </section>
        )
      )}

      {/* Right where "friends playing" would be, which for most accounts is
          nowhere: half of them follow nobody, so that section renders empty and
          this is the answer to why. */}
      {!people.loading && (
        <TasteNeighboursShelf
          neighbours={neighbours}
          levels={levels}
          lang={lang}
          viewerId={viewerId}
        />
      )}
    </>
  );
}

/**
 * The two shelves built out of what this account has been looking at.
 *
 * Separate from the block above because they belong further down the page, under
 * the community sections, and one fragment cannot be in two places. They share
 * the same `/discovery/history` answer, which the browser already has by the
 * time this asks for it again.
 */
export function ViewerDiscoveryShelves({
  lang,
  viewerId,
  labels,
}: {
  lang: UiLang;
  viewerId: string | null;
  labels: {
    recentlyViewed: string;
    recentlyViewedDescription: string;
    forYou: string;
    forYouDescription: string;
  };
}) {
  const history = useApi<{ data: { recentlyViewed: Game[]; forYou: Game[] } }>(
    viewerId ? "/discovery/history" : null,
  );
  const recentlyViewed = history.payload?.data.recentlyViewed ?? [];
  const forYou = history.payload?.data.forYou ?? [];

  const shown = [
    ...new Set(
      [...recentlyViewed, ...forYou]
        .map((game) => game.id)
        .filter((id) => id > 0),
    ),
  ].slice(0, 200);
  const cards = useApi<LibrarySnapshot>(
    viewerId && shown.length ? `/library/cards?ids=${shown.join(",")}` : null,
    { keepPrevious: true },
  );
  const savedById = new Map(
    (cards.payload?.data ?? []).map((item) => [item.igdb_id, item]),
  );

  if (!viewerId) return null;
  if (history.loading)
    return (
      <section className="library-section home-catalog-shelf">
        <ShelfSkeleton layout="covers" count={5} />
      </section>
    );

  return (
    <>
      <HomeGameShelf
        title={labels.recentlyViewed}
        description={labels.recentlyViewedDescription}
        games={recentlyViewed}
        savedById={savedById}
        lang={lang}
        enabled
      />
      <HomeGameShelf
        title={labels.forYou}
        description={labels.forYouDescription}
        games={forYou}
        savedById={savedById}
        lang={lang}
        enabled
      />
    </>
  );
}
