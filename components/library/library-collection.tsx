"use client";

import * as Toast from "@radix-ui/react-toast";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
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
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: "success" | "error";
  } | null>(null);
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
      records.filter(
        (record) => byId.has(record.igdb_id) && !removedIds.has(record.igdb_id),
      ),
    [records, byId, removedIds],
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
  function notify(message: string, tone: "success" | "error" = "success") {
    setToast({ id: Date.now(), message, tone });
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
    PLAYING: pt ? "Jogando" : "Playing",
    BACKLOG: "Backlog",
    WISHLIST: pt ? "Desejos" : "Wishlist",
    COMPLETED: pt ? "Concluídos" : "Completed",
    LIKED: pt ? "Favoritos" : "Favorites",
    RATED: pt ? "Avaliados" : "Rated",
  };
  return (
    <Toast.Provider swipeDirection="right" duration={3200}>
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
          <label className="library-sort">
            <span>{pt ? "Ordenar" : "Sort"}</span>
            <select
              value={sort}
              onChange={(event) =>
                update({
                  sort:
                    event.target.value === "recent" ? null : event.target.value,
                })
              }
            >
              <option value="recent">
                {pt ? "Atualizados recentemente" : "Recently updated"}
              </option>
              <option value="oldest">
                {pt ? "Mais antigos primeiro" : "Oldest first"}
              </option>
              <option value="rating">
                {pt ? "Minha maior nota" : "My highest rating"}
              </option>
              <option value="title">A–Z</option>
              <option value="year">
                {pt ? "Ano de lançamento" : "Release year"}
              </option>
            </select>
          </label>
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
                  onFeedback={notify}
                  onRemove={
                    owner
                      ? () =>
                          setRemovedIds((current) =>
                            new Set(current).add(game.id),
                          )
                      : undefined
                  }
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
      {toast && (
        <Toast.Root
          key={toast.id}
          className="library-toast"
          data-tone={toast.tone}
          defaultOpen
          onOpenChange={(open) => !open && setToast(null)}
        >
          {toast.tone === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <Toast.Title className="library-toast-title">
            {toast.message}
          </Toast.Title>
          <Toast.Close aria-label={pt ? "Fechar aviso" : "Close notification"}>
            <X size={15} />
          </Toast.Close>
        </Toast.Root>
      )}
      <Toast.Viewport className="library-toast-viewport" />
    </Toast.Provider>
  );
}

function matchesFilter(record: LibraryRecord, filter: Filter) {
  if (filter === "ALL") return true;
  if (filter === "PLAYING")
    return record.playing || record.status === "PLAYING";
  if (filter === "BACKLOG")
    return record.backlog || record.status === "BACKLOG";
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
