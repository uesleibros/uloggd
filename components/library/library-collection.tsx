"use client";

import type { ReactNode } from "react";
import * as Select from "@/components/ui/select";
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarDays,
  Check,
  ChevronDown,
  LayoutGrid,
  LibraryBig,
  List,
  Search,
  Star,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Game } from "@/lib/igdb";
import { QuickGameCard } from "./quick-game-card";
import { Pagination } from "@/components/pagination";
import { SearchSubmit } from "@/components/search-submit";
import { ViewSwitch } from "@/components/view-switch";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { AnimatePresence } from "motion/react";

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
  // Both are statuses the app can set and neither had a shelf, so a game put
  // on hold or dropped could only be found by scrolling everything.
  "ON_HOLD",
  "DROPPED",
  "LIKED",
  "RATED",
] as const;
type Filter = (typeof filters)[number];
type Sort = "recent" | "oldest" | "rating" | "title" | "year";

/**
 * One per sort, so the menu does not mix rows that have an icon with rows that
 * do not. That mix reads as unfinished even when each row is fine on its own.
 */
const SORT_ICONS: Record<Sort, ReactNode> = {
  recent: <ArrowDownWideNarrow size={13} />,
  oldest: <ArrowUpNarrowWide size={13} />,
  rating: <Star size={13} />,
  title: <ArrowDownAZ size={13} />,
  year: <CalendarDays size={13} />,
};
type View = "grid" | "list";

export function LibraryCollection({
  games,
  records,
  lang,
  owner,
}: {
  games: Game[];
  records: LibraryRecord[];
  lang: UiLang;
  owner: boolean;
}) {
  const t = uiText(lang);
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
  const pageSize = 24;
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
        <span aria-hidden>
          <LibraryBig size={22} />
        </span>
        <h2>
          {owner
            ? tri(
                lang,
                "Sua biblioteca está vazia",
                "Your library is empty",
                "Tu biblioteca está vacía",
              )
            : tri(
                lang,
                "Nenhum jogo nesta biblioteca",
                "No games in this library",
                "Ningún juego en esta biblioteca",
              )}
        </h2>
        <p>
          {owner
            ? tri(
                lang,
                "Adicione jogos pelo catálogo para montar sua primeira prateleira.",
                "Add games from the catalog to build your first shelf.",
                "Añade juegos desde el catálogo para armar tu primer estante.",
              )
            : tri(
                lang,
                "Esta coleção ainda não tem jogos públicos.",
                "This collection has no public games yet.",
                "Esta colección todavía no tiene juegos públicos.",
              )}
        </p>
      </section>
    );

  const labels: Record<Filter, string> = {
    ALL: t.all,
    UNCLASSIFIED: tri(
      lang,
      "Não classificados",
      "Unclassified",
      "Sin clasificar",
    ),
    PLAYING: t.playing,
    BACKLOG: "Backlog",
    WISHLIST: tri(lang, "Desejos", "Wishlist", "Deseos"),
    COMPLETED: tri(lang, "Concluídos", "Completed", "Completados"),
    ON_HOLD: tri(lang, "Pausados", "On hold", "En pausa"),
    DROPPED: tri(lang, "Abandonados", "Dropped", "Abandonados"),
    LIKED: tri(lang, "Favoritos", "Favorites", "Favoritos"),
    RATED: t.rated,
  };
  return (
    <div className="library-workspace">
      <nav
        className="game-page-nav library-smart-shelves"
        role="tablist"
        aria-label={tri(
          lang,
          "Filtros da biblioteca",
          "Library filters",
          "Filtros de la biblioteca",
        )}
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
          <label className="search-field-hit">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tri(
                lang,
                "Buscar por título ou gênero",
                "Search title or genre",
                "Buscar por título o género",
              )}
              aria-label={tri(
                lang,
                "Buscar na biblioteca",
                "Search library",
                "Buscar en la biblioteca",
              )}
            />
          </label>
          <button
            type="button"
            className="library-search-clear"
            data-hidden={!query || undefined}
            tabIndex={query ? undefined : -1}
            aria-hidden={!query || undefined}
            aria-label={t.clearSearch}
            onClick={() => {
              setQuery("");
              update({ q: null });
            }}
          >
            <X size={15} />
          </button>
          <SearchSubmit lang={lang} />
        </form>
        <div className="library-sort">
          <span>{tri(lang, "Ordenar", "Sort", "Ordenar")}</span>
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
              aria-label={tri(
                lang,
                "Ordenar biblioteca",
                "Sort library",
                "Ordenar biblioteca",
              )}
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
                      tri(
                        lang,
                        "Atualizados recentemente",
                        "Recently updated",
                        "Actualizados recientemente",
                      ),
                    ],
                    [
                      "oldest",
                      tri(
                        lang,
                        "Mais antigos primeiro",
                        "Oldest first",
                        "Más antiguos primero",
                      ),
                    ],
                    [
                      "rating",
                      tri(
                        lang,
                        "Minha maior nota",
                        "My highest rating",
                        "Mi nota más alta",
                      ),
                    ],
                    ["title", "A–Z"],
                    [
                      "year",
                      tri(
                        lang,
                        "Ano de lançamento",
                        "Release year",
                        "Año de lanzamiento",
                      ),
                    ],
                  ].map(([value, label]) => (
                    <Select.Item
                      key={value}
                      value={value}
                      className="library-sort-option"
                    >
                      {SORT_ICONS[value as Sort]}
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
        <ViewSwitch
          value={view}
          label={tri(
            lang,
            "Modo de visualização",
            "View mode",
            "Modo de visualización",
          )}
          items={[
            {
              value: "grid",
              label: tri(
                lang,
                "Visualizar em grade",
                "Grid view",
                "Vista de cuadrícula",
              ),
              icon: <LayoutGrid size={15} />,
            },
            {
              value: "list",
              label: tri(
                lang,
                "Visualizar em lista",
                "List view",
                "Vista de lista",
              ),
              icon: <List size={15} />,
            },
          ]}
          onChange={(next) => update({ view: next === "grid" ? null : next })}
        />
      </div>
      <div className="library-results-meta">
        <span>
          {visibleRecords.length.toLocaleString(lang)}{" "}
          {visibleRecords.length === 1
            ? tri(lang, "jogo", "game", "juego")
            : t.gamesLower}
        </span>
        {totalPages > 1 && (
          <span>
            {tri(lang, "Página", "Page", "Página")} {currentPage} / {totalPages}
          </span>
        )}
      </div>
      {!pageRecords.length ? (
        <div className="library-filter-empty">
          <span aria-hidden>
            <Search size={22} />
          </span>
          <h2>
            {tri(
              lang,
              "Nenhum jogo encontrado",
              "No games found",
              "No se encontraron juegos",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "Tente outra busca ou escolha uma prateleira diferente.",
              "Try another search or choose a different shelf.",
              "Prueba otra búsqueda o elige un estante diferente.",
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              update({ q: null, filter: null });
            }}
          >
            {t.clearFilters}
          </button>
        </div>
      ) : (
        <div className="library-results" data-view={view}>
          {/* Without this, a removed card is gone between two renders and its
              exit animation never gets a chance to run. `popLayout` takes the
              leaving card out of flow so the others close the gap while it
              fades rather than after. */}
          <AnimatePresence initial={false} mode="popLayout">
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
          </AnimatePresence>
        </div>
      )}
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        lang={lang}
        className="library-pagination"
        onGo={(next) => update({ page: next === 1 ? null : String(next) })}
      />
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
