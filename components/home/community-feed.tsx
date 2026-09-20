"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { ShelfSkeleton } from "@/components/home/shelf-skeleton";
import { LoadError } from "@/components/ui/load-error";
import {
  ActivityStream,
  type SocialEntry,
} from "@/components/social/activity-stream";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * What the community has been doing, in the two shapes the home page shows it.
 *
 * One read serving both sections: the reviews section takes the four newest
 * reviews and the timeline takes the six newest of everything else, which is why
 * it was one `getActivity` on the server. It is one read here too, from the
 * browser.
 *
 * This was the last thing holding the document open. The individual reviews,
 * logs and screenshots each have their own page and those are what search
 * engines index; a rolling feed of the newest few is not something anybody
 * arrives at from a search result, so nothing is lost by filling it in once the
 * page is already on screen.
 */
export function CommunityFeed({
  lang,
  viewerId,
}: {
  lang: UiLang;
  viewerId: string | null;
}) {
  const feed = useApi<{ data: SocialEntry[] }>("/activity?limit=18");
  const entries = feed.payload?.data ?? [];
  const reviews = entries
    .filter((entry) => entry.kind === "review")
    .slice(0, 4);
  const updates = entries
    .filter((entry) => entry.kind !== "review")
    .slice(0, 6);

  return (
    <>
      <section
        className="home-reviews-section"
        aria-labelledby="community-reviews-title"
      >
        <div className="home-section-heading">
          <div>
            <h2 id="community-reviews-title">
              {tri(
                lang,
                "Avaliações recentes",
                "Recent reviews",
                "Reseñas recientes",
              )}
            </h2>
          </div>
          {/* The way out of the four slots. Three hundred and seventy-six
              reviews exist and this section shows four of them, so without this
              the rest are only reachable by somebody who thinks to open advanced
              search and notice a new tab. */}
          <Link href={`/${lang}/search?scope=reviews`}>
            {tri(lang, "Ver todas", "See all", "Ver todas")}
            <ArrowRight size={15} />
          </Link>
        </div>
        {feed.loading ? (
          <ShelfSkeleton layout="reviews" count={4} />
        ) : feed.error ? (
          // Not "the next reviews will appear here": that is a claim about the
          // community, and the page only knows its request failed.
          <LoadError lang={lang} onRetry={feed.reload} />
        ) : reviews.length > 0 ? (
          <ActivityStream entries={reviews} lang={lang} viewerId={viewerId} />
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

      {/* Only while it has something in it. This section carries what is not
          a review (sessions, screenshots, journals), and with none of those
          the page ended on a heading over a box reading "nothing logged yet,
          public reviews and sessions will appear here", directly underneath
          four reviews. */}
      {(feed.loading || updates.length > 0) && (
        <section
          className="home-activity-section"
          aria-labelledby="community-updates-title"
        >
          <div className="home-section-heading">
            <div>
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
          {feed.loading ? (
            <ShelfSkeleton layout="rows" count={3} />
          ) : feed.error ? null : (
            <ActivityStream entries={updates} lang={lang} viewerId={viewerId} />
          )}
        </section>
      )}
    </>
  );
}
