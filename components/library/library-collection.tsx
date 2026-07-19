"use client";

import * as Select from "@radix-ui/react-select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Game } from "@/lib/igdb";
import { QuickGameCard } from "./quick-game-card";

export type LibraryRecord = {
  igdb_id: number;
  status:
    "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
  updated_at: string;
};

const filters = [
  "ALL",
  "UNCLASSIFIED",
  "PLAYING",
  "BACKLOG",
  "WISHLIST",
  "COMPLETED",
  "LIKED",
  "RATED",
] as const;
type Filter = (typeof filters)[number];
type Sort = "recent" | "oldest" | "rating" | "title" | "year";
type View = "grid" | "list";

export function LibraryCollection({
  games,
  records,
  lang,
  owner,
}: {
  games: Game[];
  records: LibraryRecord[];
  lang: "pt-BR" | "en";
  owner: boolean;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [removedIds, setRemovedIds] = useState<Set<number>>(() => new Set());
  const [liveRecords, setLiveRecords] = useState(records);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const requestedFilter = searchParams.get("filter")?.toUpperCase() as Filter;
  const filter: Filter = filters.includes(requestedFilter)
    ? requestedFilter
    : "ALL";
  const requestedSort = searchParams.get("sort") as Sort;
  const sort: Sort = ["recent", "oldest", "rating", "title", "year"].includes(
    requestedSort,
  )
    ? requestedSort
    : "recent";
  const view: View = searchParams.get("view") === "list" ? "list" : "grid";
  const requestedPage = Number(searchParams.get("page"));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const byId = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games],
  );
  const activeRecords = useMemo(
    () =>
      liveRecords.filter(
        (record) => byId.has(record.igdb_id) && !removedIds.has(record.igdb_id),
      ),
    [liveRecords, byId, removedIds],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        filters.map((item) => [
          item,
          activeRecords.filter((record) => matchesFilter(record, item)).length,
        ]),
      ) as Record<Filter, number>,
    [activeRecords],
  );
  const visibleRecords = useMemo(() => {
    const normalized = (searchParams.get("q") ?? "").trim().toLocaleLowerCase();
    return activeRecords
      .filter((record) => {
        const game = byId.get(record.igdb_id)!;
        return (
          matchesFilter(record, filter) &&
          (!normalized ||
            game.name.toLocaleLowerCase().includes(normalized) ||
            game.genres.some((genre) =>
              genre.toLocaleLowerCase().includes(normalized),
            ))
        );
      })
      .sort((a, b) => compareRecords(a, b, byId, sort));
  }, [activeRecords, byId, filter, searchParams, sort]);
  const pageSize = view === "grid" ? 24 : 14;
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRecords = visibleRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function update(values: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) =>
      value ? params.set(key, value) : params.delete(key),
    );
    if (!("page" in values)) params.delete("page");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }
  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ q: query.trim() || null });
  }
  function updateRecord(igdbId: number, next: Partial<LibraryRecord>) {
    runLayoutTransition(() =>
      setLiveRecords((current) =>
        current.map((record) =>
          record.igdb_id === igdbId
            ? { ...record, ...next, updated_at: new Date().toISOString() }
            : record,
        ),
      ),
    );
  }

  function removeRecord(igdbId: number) {
    const commit = () =>
      setRemovedIds((current) => new Set(current).add(igdbId));
    runLayoutTransition(commit);
  }

  function runLayoutTransition(commit: () => void) {
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) commit();
    else if (transitionDocument.startViewTransition)
      transitionDocument.startViewTransition(commit);
    else commit();
  }

  if (!activeRecords.length)
    return (
      <section className="library-empty" aria-live="polite">
        <h2>
          {owner
            ? pt
              ? "Sua biblioteca está vazia"
              : "Your library is empty"
            : pt
              ? "Nenhum jogo nesta biblioteca"
              : "No games in this library"}
        </h2>
        <p>
          {owner
            ? pt
              ? "Adicione jogos pelo catálogo para montar sua primeira prateleira."
              : "Add games from the catalog to build your first shelf."
            : pt
              ? "Esta coleção ainda não tem jogos públicos."
              : "This collection has no public games yet."}
        </p>
      </section>
    );

  const labels: Record<Filter, string> = {
    ALL: pt ? "Todos" : "All",
    UNCLASSIFIED: pt ? "Não classificados" : "Unclassified",
    PLAYING: pt ? "Jogando" : "Playing",
    BACKLOG: "Backlog",
    WISHLIST: pt ? "Desejos" : "Wishlist",
    COMPLETED: pt ? "Concluídos" : "Completed",
    LIKED: pt ? "Favoritos" : "Favorites",
    RATED: pt ? "Avaliados" : "Rated",
  };
  return (
    <div className="library-workspace">
      <nav
        className="game-page-nav library-smart-shelves"
        role="tablist"
        aria-label={pt ? "Filtros da biblioteca" : "Library filters"}
      >
        {filters.map((item) => (
          <button
            type="button"
            role="tab"
            key={item}
            data-active={filter === item || undefined}
            aria-selected={filter === item}
            onClick={() =>
              update({ filter: item === "ALL" ? null : item.toLowerCase() })
            }
          >
            <span>{labels[item]}</span>
            <strong>{counts[item]}</strong>
          </button>
        ))}
      </nav>
      <div className="library-toolbar">
        <form onSubmit={submitSearch} className="library-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              pt ? "Buscar por título ou gênero" : "Search title or genre"
            }
            aria-label={pt ? "Buscar na biblioteca" : "Search library"}
          />
          {query && (
            <button
              type="button"
              aria-label={pt ? "Limpar busca" : "Clear search"}
              onClick={() => {
                setQuery("");
                update({ q: null });
              }}
            >
              <X size={15} />
            </button>
          )}
        </form>
        <div className="library-sort">
          <span>{pt ? "Ordenar" : "Sort"}</span>
          <Select.Root
            value={sort}
            onValueChange={(value) =>
              update({
                sort: value === "recent" ? null : value,
              })
            }
          >
            <Select.Trigger
              className="library-sort-trigger"
              aria-label={pt ? "Ordenar biblioteca" : "Sort library"}
            >
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={14} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="library-sort-menu"
                position="popper"
                sideOffset={6}
                collisionPadding={12}
              >
                <Select.Viewport>
                  {[
                    [
                      "recent",
                      pt ? "Atualizados recentemente" : "Recently updated",
                    ],
                    ["oldest", pt ? "Mais antigos primeiro" : "Oldest first"],
                    ["rating", pt ? "Minha maior nota" : "My highest rating"],
                    ["title", "A–Z"],
                    ["year", pt ? "Ano de lançamento" : "Release year"],
                  ].map(([value, label]) => (
                    <Select.Item
                      key={value}
                      value={value}
                      className="library-sort-option"
                    >
                      <Select.ItemText>{label}</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check size={13} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div
          className="library-view-switch"
          aria-label={pt ? "Modo de visualização" : "View mode"}
        >
          <button
            type="button"
            data-active={view === "grid" || undefined}
            onClick={() => update({ view: null })}
            aria-label={pt ? "Visualizar em grade" : "Grid view"}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            type="button"
            data-active={view === "list" || undefined}
            onClick={() => update({ view: "list" })}
            aria-label={pt ? "Visualizar em lista" : "List view"}
          >
            <List size={17} />
          </button>
        </div>
      </div>
      <div className="library-results-meta">
        <span>
          {visibleRecords.length.toLocaleString(lang)}{" "}
          {visibleRecords.length === 1
            ? pt
              ? "jogo"
              : "game"
            : pt
              ? "jogos"
              : "games"}
        </span>
        {totalPages > 1 && (
          <span>
            {pt ? "Página" : "Page"} {currentPage} / {totalPages}
          </span>
        )}
      </div>
      {!pageRecords.length ? (
        <div className="library-filter-empty">
          <h2>{pt ? "Nenhum jogo encontrado" : "No games found"}</h2>
          <p>
            {pt
              ? "Tente outra busca ou escolha uma prateleira diferente."
              : "Try another search or choose a different shelf."}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              update({ q: null, filter: null });
            }}
          >
            {pt ? "Limpar filtros" : "Clear filters"}
          </button>
        </div>
      ) : (
        <div className="library-results" data-view={view}>
          {pageRecords.map((record) => {
            const game = byId.get(record.igdb_id)!;
            return (
              <QuickGameCard
                key={game.id}
                game={game}
                initial={record}
                lang={lang}
                enabled={owner}
                removable={owner}
                onStateChange={(next) => updateRecord(game.id, next)}
                onRemove={owner ? () => removeRecord(game.id) : undefined}
                meta={[game.releaseYear, ...game.genres]
                  .filter(Boolean)
                  .join(" · ")}
              />
            );
          })}
        </div>
      )}
      {totalPages > 1 && (
        <nav
          className="library-pagination"
          aria-label={pt ? "Paginação da biblioteca" : "Library pagination"}
        >
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => update({ page: String(currentPage - 1) })}
          >
            <ChevronLeft size={16} />
            {pt ? "Anterior" : "Previous"}
          </button>
          <div>
            {paginationItems(currentPage, totalPages).map((item, index) =>
              item === "…" ? (
                <span key={`ellipsis-${index}`}>…</span>
              ) : (
                <button
                  type="button"
                  key={item}
                  data-current={item === currentPage || undefined}
                  aria-current={item === currentPage ? "page" : undefined}
                  onClick={() =>
                    update({ page: item === 1 ? null : String(item) })
                  }
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => update({ page: String(currentPage + 1) })}
          >
            {pt ? "Próxima" : "Next"}
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}

function matchesFilter(record: LibraryRecord, filter: Filter) {
  if (filter === "ALL") return true;
  if (filter === "UNCLASSIFIED")
    return (
      record.status === "BACKLOG" &&
      !record.playing &&
      !record.backlog &&
      !record.wishlist
    );
  if (filter === "PLAYING")
    return record.playing || record.status === "PLAYING";
  if (filter === "BACKLOG") return record.backlog;
  if (filter === "WISHLIST")
    return record.wishlist || record.status === "WISHLIST";
  if (filter === "LIKED") return record.liked;
  if (filter === "RATED") return record.quick_rating !== null;
  return record.status === filter;
}
function compareRecords(
  a: LibraryRecord,
  b: LibraryRecord,
  games: Map<number, Game>,
  sort: Sort,
) {
  const gameA = games.get(a.igdb_id)!;
  const gameB = games.get(b.igdb_id)!;
  if (sort === "oldest") return a.updated_at.localeCompare(b.updated_at);
  if (sort === "rating")
    return (
      (b.quick_rating ?? -1) - (a.quick_rating ?? -1) ||
      gameA.name.localeCompare(gameB.name)
    );
  if (sort === "title") return gameA.name.localeCompare(gameB.name);
  if (sort === "year")
    return (
      (gameB.releaseYear ?? 0) - (gameA.releaseYear ?? 0) ||
      gameA.name.localeCompare(gameB.name)
    );
  return b.updated_at.localeCompare(a.updated_at);
}
function paginationItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set(
    [1, total, current - 1, current, current + 1].filter(
      (value) => value >= 1 && value <= total,
    ),
  );
  const sorted = [...values].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((value, index) => {
    if (index && value - sorted[index - 1] > 1) result.push("…");
    result.push(value);
  });
  return result;
}
