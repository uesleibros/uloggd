"use client";

import { useState } from "react";
import type { Game } from "@/lib/igdb";
import { QuickGameCard } from "./quick-game-card";

type LibraryRecord = {
  igdb_id: number;
  status:
    "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
};

export function LibraryCollection({
  games,
  records,
  lang,
}: {
  games: Game[];
  records: LibraryRecord[];
  lang: "pt-BR" | "en";
}) {
  const [removedIds, setRemovedIds] = useState<Set<number>>(() => new Set());
  const byId = new Map(games.map((game) => [game.id, game]));
  const visibleRecords = records.filter(
    (record) => byId.has(record.igdb_id) && !removedIds.has(record.igdb_id),
  );

  if (!visibleRecords.length) {
    return (
      <section className="library-empty" aria-live="polite">
        <h2>
          {lang === "pt-BR"
            ? "Sua biblioteca está vazia"
            : "Your library is empty"}
        </h2>
        <p>
          {lang === "pt-BR"
            ? "Use as ações rápidas nas capas da página inicial para começar."
            : "Use the quick actions on home page covers to get started."}
        </p>
      </section>
    );
  }

  return (
    <div className="library-grid">
      {visibleRecords.map((record) => {
        const game = byId.get(record.igdb_id)!;
        return (
          <QuickGameCard
            key={game.id}
            game={game}
            initial={record}
            lang={lang}
            removable
            onRemove={() =>
              setRemovedIds((current) => new Set(current).add(game.id))
            }
          />
        );
      })}
    </div>
  );
}
