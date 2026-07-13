"use client";

import { useState } from "react";
import type { Game, GameDetail } from "@/lib/igdb";
import { QuickGameCard } from "./library/quick-game-card";

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
  lang: "pt-BR" | "en";
  enabled: boolean;
}) {
  const [active, setActive] = useState(groups[0]?.kind);
  if (!groups.length || !active) return null;
  const labels =
    lang === "pt-BR"
      ? {
          expansions: "DLCs e expansões",
          editions: "Edições e ports",
          remakes: "Remakes e remasters",
          similar: "Relacionados",
        }
      : {
          expansions: "DLCs and expansions",
          editions: "Editions and ports",
          remakes: "Remakes and remasters",
          similar: "Related",
        };
  const group = groups.find((item) => item.kind === active) ?? groups[0];

  return (
    <section className="game-section game-related-section" id="related">
      <header className="game-section-heading">
        <div>
          <span>
            {lang === "pt-BR" ? "MAIS DO JOGO" : "MORE FROM THE GAME"}
          </span>
          <h2>{lang === "pt-BR" ? "Jogos relacionados" : "Related games"}</h2>
        </div>
      </header>
      <div
        className="related-tabs"
        role="tablist"
        aria-label={
          lang === "pt-BR"
            ? "Tipos de jogos relacionados"
            : "Related game types"
        }
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
