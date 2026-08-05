import { QuickGameCard } from "@/components/library/quick-game-card";
import { ShelfCarousel } from "@/components/shelf-carousel";
import { weeksSince, type PlayNextEntry } from "@/lib/play-next";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * One shelf of a person's own library, on the page they land on.
 *
 * The card is `QuickGameCard`, the same one every other shelf here uses, so
 * the status menu, the cover fallback and the hover all come along without
 * being written again.
 *
 * The only thing this adds is the note under a game nobody has touched in a
 * while. That is the whole point of the shelf: a library of thirty-six games
 * knows what was abandoned and has never said so.
 */
export function PlayNextShelf({
  id,
  eyebrow,
  title,
  entries,
  lang,
  showIdleFor,
}: {
  id: string;
  eyebrow: string;
  title: string;
  entries: PlayNextEntry[];
  lang: UiLang;
  /** Only the in-progress shelf says how long something has been sitting. */
  showIdleFor?: boolean;
}) {
  if (!entries.length) return null;
  return (
    <section className="home-playing-section" aria-labelledby={`${id}-title`}>
      <div className="home-section-heading">
        <div>
          <span>{eyebrow}</span>
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
      </div>
      <ShelfCarousel
        label={title}
        lang={lang}
        className="home-playing-carousel"
      >
        {entries.map((entry) => {
          const idle = showIdleFor ? weeksSince(entry.updatedAt) : null;
          return (
            <article key={entry.game.id}>
              <QuickGameCard
                game={entry.game}
                initial={entry.state}
                lang={lang}
                enabled
              />
              {idle !== null && (
                <p className="play-next-idle">
                  {tri(
                    lang,
                    `parado há ${idle} semana${idle === 1 ? "" : "s"}`,
                    `untouched for ${idle} week${idle === 1 ? "" : "s"}`,
                    `sin tocar hace ${idle} semana${idle === 1 ? "" : "s"}`,
                  )}
                </p>
              )}
            </article>
          );
        })}
      </ShelfCarousel>
    </section>
  );
}
