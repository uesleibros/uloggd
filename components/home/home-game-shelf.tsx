import { ShelfCarousel } from "@/components/shelf-carousel";
import { QuickGameCard } from "@/components/library/quick-game-card";
import type { Game } from "@/lib/igdb";
import type { UiLang } from "@/lib/ui-text";

/**
 * What a card needs to know about the viewer's own copy of a game.
 *
 * Declared here rather than in the page, because the shelves that fetch
 * themselves from the browser need it too.
 */
export type SavedGameState = {
  status:
    "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
};

/**
 * A row of game cards under a heading, the home page's plainest shape.
 *
 * It lived inside the page while every shelf on the page was server rendered.
 * The shelves that belong to the viewer fetch themselves from the browser now,
 * and they draw the same row, so this had to be somewhere both can reach.
 */
export function HomeGameShelf({
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
  games: Game[];
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
