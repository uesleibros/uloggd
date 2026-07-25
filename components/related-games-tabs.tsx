"use client";

import { useState } from "react";
import type { Game, GameDetail } from "@/lib/igdb";
import { QuickGameCard } from "./library/quick-game-card";
import { tri, type UiLang } from "@/lib/ui-text";

export type SavedState = {
  status:
    "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
} | null;

export function RelatedGamesTabs({
  groups,
  saved,
  lang,
  enabled,
}: {
  groups: GameDetail["related"];
  saved: Record<number, SavedState>;
  lang: UiLang;
  enabled: boolean;
}) {
  const [active, setActive] = useState(groups[0]?.kind);
  if (!groups.length || !active) return null;
  const labels = {
    expansions: tri(
      lang,
      "DLCs e expansões",
      "DLCs and expansions",
      "DLC y expansiones",
    ),
    editions: tri(
      lang,
      "Edições e ports",
      "Editions and ports",
      "Ediciones y ports",
    ),
    remakes: tri(
      lang,
      "Remakes e remasters",
      "Remakes and remasters",
      "Remakes y remasters",
    ),
    similar: tri(lang, "Relacionados", "Related", "Relacionados"),
  };
  const group = groups.find((item) => item.kind === active) ?? groups[0];

  return (
    <section className="game-section game-related-section" id="related">
      <header className="game-section-heading">
        <div>
          <h2>
            {tri(
              lang,
              "Jogos relacionados",
              "Related games",
              "Juegos relacionados",
            )}
          </h2>
        </div>
      </header>
      <div
        className="related-tabs"
        role="tablist"
        aria-label={tri(
          lang,
          "Tipos de jogos relacionados",
          "Related game types",
          "Tipos de juegos relacionados",
        )}
      >
        {groups.map((item) => (
          <button
            key={item.kind}
            type="button"
            role="tab"
            aria-selected={active === item.kind}
            aria-controls="related-games-panel"
            onClick={() => setActive(item.kind)}
          >
            {labels[item.kind]}
            <span>{item.games.length}</span>
          </button>
        ))}
      </div>
      <div
        className="game-related-shelf"
        id="related-games-panel"
        role="tabpanel"
      >
        {group.games.map((game: Game) => (
          <QuickGameCard
            key={game.id}
            game={game}
            initial={saved[game.id] ?? null}
            lang={lang}
            enabled={enabled}
          />
        ))}
      </div>
    </section>
  );
}
