import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConnectionCard } from "@/components/social/connection-card";
import type { TasteNeighbour } from "@/lib/taste-neighbours";
import type { ProfileLevel } from "@/lib/profile-level";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The introduction the site never made.
 *
 * A grid rather than a carousel, unlike every other shelf on this page. The
 * others hold covers, which are square and read fine sliding past; these hold
 * a name, a handle and a reason, which have to be read rather than glanced at.
 * A row of text scrolling sideways gets skipped.
 *
 * Six, out of the twelve the query returns. Everyone here has nine to thirteen
 * candidates, and a page that offers all of them is a directory, not a
 * suggestion.
 */
const SHOWN = 6;

export function TasteNeighboursShelf({
  neighbours,
  levels,
  lang,
  viewerId,
}: {
  neighbours: TasteNeighbour[];
  levels: Map<string, ProfileLevel>;
  lang: UiLang;
  viewerId: string;
}) {
  if (!neighbours.length) return null;
  return (
    <section className="home-playing-section" aria-labelledby="taste-title">
      <div className="home-section-heading">
        <div>
          <span>{tri(lang, "PESSOAS", "PEOPLE", "PERSONAS")}</span>
          <h2 id="taste-title">
            {tri(
              lang,
              "Jogam o que você joga",
              "They play what you play",
              "Juegan lo que juegas",
            )}
          </h2>
        </div>
        {/* Six are shown of the twelve ranked, and the search page holds
            everybody. A shelf that suggests people and leads nowhere else is
            the same dead end this feature exists to fix. */}
        <Link href={`/${lang}/search?scope=people`}>
          {tri(lang, "Ver mais", "See more", "Ver más")}
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="profile-connections-grid">
        {neighbours.slice(0, SHOWN).map((neighbour) => (
          <ConnectionCard
            key={neighbour.person.id}
            person={neighbour.person}
            lang={lang}
            standing={levels.get(neighbour.person.id)}
            viewerId={viewerId}
            note={tri(
              lang,
              `${neighbour.sharedGames} em comum`,
              `${neighbour.sharedGames} in common`,
              `${neighbour.sharedGames} en común`,
            )}
          />
        ))}
      </div>
    </section>
  );
}
