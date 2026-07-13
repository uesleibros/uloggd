"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const byId = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games],
  );
  const visibleRecords = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const game = byId.get(record.igdb_id);
      return (
        game &&
        !removedIds.has(record.igdb_id) &&
        (filter === "ALL" ||
          record.status === filter ||
          (filter === "RATED" && record.quick_rating !== null)) &&
        (!normalized || game.name.toLocaleLowerCase().includes(normalized))
      );
    });
  }, [records, byId, removedIds, filter, query]);

  if (
    !records.length ||
    records.every((record) => removedIds.has(record.igdb_id))
  ) {
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
    <>
      <div className="library-toolbar">
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              lang === "pt-BR" ? "Buscar na biblioteca" : "Search your library"
            }
          />
        </label>
        <label>
          <SlidersHorizontal size={15} />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label={
              lang === "pt-BR" ? "Filtrar biblioteca" : "Filter library"
            }
          >
            <option value="ALL">{lang === "pt-BR" ? "Todos" : "All"}</option>
            <option value="PLAYING">
              {lang === "pt-BR" ? "Jogando" : "Playing"}
            </option>
            <option value="COMPLETED">
              {lang === "pt-BR" ? "Concluídos" : "Completed"}
            </option>
            <option value="BACKLOG">Backlog</option>
            <option value="WISHLIST">Wishlist</option>
            <option value="DROPPED">
              {lang === "pt-BR" ? "Abandonados" : "Dropped"}
            </option>
            <option value="RATED">
              {lang === "pt-BR" ? "Avaliados" : "Rated"}
            </option>
          </select>
        </label>
      </div>
      {!visibleRecords.length ? (
        <div className="library-filter-empty">
          {lang === "pt-BR"
            ? "Nenhum jogo corresponde a esse filtro."
            : "No games match this filter."}
        </div>
      ) : (
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
      )}
    </>
  );
}
