"use client";

import * as Select from "@/components/ui/select";
import {
  ArrowDownAZ,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  Gamepad2,
  Globe2,
  Heart,
  History,
  Layers3,
  LayoutGrid,
  ListOrdered,
  LoaderCircle,
  Lock,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ListPreview, ListSort, ListVisibility } from "@/lib/lists-types";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { SearchSubmit } from "@/components/search-submit";
import { ListPreviewCard } from "./list-preview-card";

type Mode = "ALL" | "RANKED" | "COLLECTION" | "TIERLIST";
type Visibility = ListVisibility | "ALL";

type Filters = {
  visibility: Visibility;
  mode: Mode;
  sort: ListSort;
  q: string;
};

const DEFAULTS: Filters = {
  visibility: "ALL",
  mode: "ALL",
  sort: "recent",
  q: "",
};

function isDefault(filters: Filters) {
  return (
    filters.visibility === DEFAULTS.visibility &&
    filters.mode === DEFAULTS.mode &&
    filters.sort === DEFAULTS.sort &&
    !filters.q
  );
}

function paramsFor(filters: Filters) {
  const url = new URLSearchParams();
  if (filters.visibility !== DEFAULTS.visibility)
    url.set("visibility", filters.visibility);
  if (filters.mode !== DEFAULTS.mode) url.set("mode", filters.mode);
  if (filters.sort !== DEFAULTS.sort) url.set("sort", filters.sort);
  if (filters.q) url.set("q", filters.q);
  return url;
}

/**
 * Somebody's lists: filters, sort, search, and a paginated grid.
 *
 * The same component whoever is reading. A visitor used to get a bare grid
 * with a "load more" under it and nothing else: no search, no sort, no way to
 * ask for only the rankings, on the same lists the owner could do all three
 * to. Two people looking at the same page saw two different pages, and the
 * one who could do less was the one who had not seen them before.
 *
 * What the owner still has to themselves is the visibility filter, because
 * only they have anything to filter: a visitor is shown the public ones by
 * the database, whatever this asks for.
 *
 * Filters are URL-owned so the view is shareable and survives a refresh; the
 * server rendered the first page with the same params on load.
 */
export function ListsCollection({
  lang,
  ownerId,
  owner,
  heading,
  initial,
  total,
  grandTotal,
  pageSize,
  filters: initialFilters,
}: {
  lang: UiLang;
  ownerId: string;
  /** Whether the reader is the person whose lists these are. */
  owner: boolean;
  heading: string;
  initial: ListPreview[];
  total: number;
  grandTotal: number;
  pageSize: number;
  filters: Filters;
}) {
  const t = uiText(lang);
  const pathname = usePathname();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [query, setQuery] = useState(initialFilters.q);
  const [rows, setRows] = useState<ListPreview[]>(initial);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const activeKey = useRef(JSON.stringify(initialFilters));
  const filtered = total;
  const done = rows.length >= filtered;
  const filtersActive = !isDefault(filters);

  // A server render is the authoritative snapshot: the first paint, a
  // router.refresh() after the create dialog saves, or a back/forward. useState
  // ignores a changed `initial` prop, so without adopting it here a list created
  // in the dialog never showed up until a hard reload.
  const serverKey = useMemo(
    () =>
      [
        JSON.stringify(initialFilters),
        total,
        initial.map((row) => row.id).join(),
      ].join("|"),
    [initialFilters, total, initial],
  );
  const [syncedServerKey, setSyncedServerKey] = useState(serverKey);
  if (syncedServerKey !== serverKey) {
    setSyncedServerKey(serverKey);
    // A refresh can land while the client holds filters the server never
    // rendered. That payload describes a different view, so the client-side
    // fetch stays authoritative and this snapshot is dropped.
    if (JSON.stringify(initialFilters) === JSON.stringify(filters)) {
      setRows(initial);
      setError(false);
    }
  }

  // Debounces free-text search but commits the other filters immediately.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query !== filters.q) setFilters((prev) => ({ ...prev, q: query }));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, filters.q]);

  // Whenever filters change, refetch the first page and reset the URL.
  useEffect(() => {
    const key = JSON.stringify(filters);
    if (key === activeKey.current) return;
    activeKey.current = key;
    const params = paramsFor(filters);
    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    window.history.replaceState(null, "", nextUrl);
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const requestParams = new URLSearchParams(params);
    requestParams.set("profile", ownerId);
    requestParams.set("limit", String(pageSize));
    fetch(`/api/lists?${requestParams.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const { lists: next } = (await response.json()) as {
          lists: ListPreview[];
        };
        if (activeKey.current !== key) return;
        setRows(next);
      })
      .catch((caught) => {
        if ((caught as Error).name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (activeKey.current === key) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, ownerId, pageSize, pathname]);

  async function loadMore() {
    if (loadingMore || done) return;
    setLoadingMore(true);
    setError(false);
    try {
      const params = paramsFor(filters);
      params.set("profile", ownerId);
      params.set("limit", String(pageSize));
      params.set("offset", String(rows.length));
      const response = await fetch(`/api/lists?${params.toString()}`);
      if (!response.ok) throw new Error(String(response.status));
      const { lists: next } = (await response.json()) as {
        lists: ListPreview[];
      };
      setRows((prev) => (next.length ? [...prev, ...next] : prev));
    } catch {
      setError(true);
    }
    setLoadingMore(false);
  }

  const visibilityOptions = useMemo(
    () => [
      { value: "ALL" as const, label: t.all, icon: Layers3 },
      {
        value: "PUBLIC" as const,
        label: tri(lang, "Públicas", "Public", "Públicas"),
        icon: Globe2,
      },
      { value: "FOLLOWERS" as const, label: t.followers, icon: Users },
      {
        value: "PRIVATE" as const,
        label: tri(lang, "Privadas", "Private", "Privadas"),
        icon: Lock,
      },
    ],
    [lang, t.all, t.followers],
  );
  const sortOptions = useMemo(
    () => [
      {
        value: "recent" as const,
        label: tri(
          lang,
          "Atualizadas recentes",
          "Recently updated",
          "Actualizadas recientes",
        ),
        icon: Clock3,
      },
      {
        value: "oldest" as const,
        label: tri(lang, "Mais antigas", "Oldest first", "Más antiguas"),
        icon: History,
      },
      {
        value: "name" as const,
        label: tri(lang, "Nome (A→Z)", "Name (A→Z)", "Nombre (A→Z)"),
        icon: ArrowDownAZ,
      },
      {
        value: "size" as const,
        label: tri(lang, "Mais jogos", "Most games", "Más juegos"),
        icon: Gamepad2,
      },
      {
        value: "likes" as const,
        label: tri(lang, "Mais curtidas", "Most liked", "Más gustadas"),
        icon: Heart,
      },
    ],
    [lang],
  );
  // A filter beside the others rather than a row of tabs above them. Tabs
  // said these were three places to be, when they are one page asking which
  // of its lists to show, the same question as "public or private" and "newest
  // or largest" right next to it.
  const modeOptions = useMemo(
    () => [
      { value: "ALL" as const, label: t.all, icon: Filter },
      {
        value: "COLLECTION" as const,
        label: tri(lang, "Normal", "Plain", "Normal"),
        icon: Layers3,
      },
      {
        value: "RANKED" as const,
        label: tri(lang, "Ranking", "Ranking", "Ranking"),
        icon: ListOrdered,
      },
      {
        value: "TIERLIST" as const,
        label: tri(lang, "Tierlist", "Tier list", "Tierlist"),
        icon: LayoutGrid,
      },
    ],
    [lang, t.all],
  );

  return (
    <section className="lists-collection">
      <header className="lists-toolbar">
        <div className="lists-toolbar-heading">
          <h2>{heading}</h2>
          <p>
            {filtersActive
              ? tri(
                  lang,
                  `${filtered} de ${grandTotal}`,
                  `${filtered} of ${grandTotal}`,
                  `${filtered} de ${grandTotal}`,
                )
              : tri(
                  lang,
                  `${grandTotal} no total`,
                  `${grandTotal} total`,
                  `${grandTotal} en total`,
                )}
          </p>
        </div>
        <div className="lists-toolbar-controls">
          <form
            className="lists-search"
            role="search"
            onSubmit={(event) => {
              // The field already searches while typing; submitting only skips
              // the debounce so the button is never a dead control.
              event.preventDefault();
              setFilters((prev) => ({ ...prev, q: query }));
            }}
          >
            <label className="search-field-hit">
              {loading ? (
                <LoaderCircle className="spin" size={15} aria-hidden />
              ) : (
                <Search size={15} aria-hidden />
              )}
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={60}
                aria-label={tri(
                  lang,
                  "Buscar nas suas listas",
                  "Search your lists",
                  "Buscar en tus listas",
                )}
                placeholder={tri(
                  lang,
                  "Buscar lista",
                  "Search list",
                  "Buscar lista",
                )}
              />
            </label>
            <button
              type="button"
              className="lists-search-clear"
              data-hidden={!query ? true : undefined}
              aria-label={t.clearSearch}
              onClick={() => {
                setQuery("");
                setFilters((prev) => ({ ...prev, q: "" }));
              }}
            >
              <X size={14} />
            </button>
            <SearchSubmit lang={lang} pending={loading} />
          </form>
          <label className="lists-toolbar-select">
            <span>{tri(lang, "Tipo", "Kind", "Tipo")}</span>
            <Select.Root
              value={filters.mode}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, mode: value as Mode }))
              }
            >
              <Select.Trigger className="editor-select-trigger">
                <Select.Value>
                  {modeOptions.find((o) => o.value === filters.mode)?.label}
                </Select.Value>
                <Select.Icon>
                  <ChevronDown size={14} />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="editor-select-menu"
                  position="popper"
                  sideOffset={6}
                  collisionPadding={12}
                >
                  <Select.Viewport>
                    {modeOptions.map(({ value, label, icon: Icon }) => (
                      <Select.Item
                        key={value}
                        value={value}
                        className="editor-select-option"
                      >
                        <Icon size={14} />
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
          </label>
          {/* The owner's alone: a visitor has nothing to filter, since
                the policies answer with the public ones whatever is asked
                for. */}
          {owner && (
            <label className="lists-toolbar-select">
              <span>{t.visibility}</span>
              <Select.Root
                value={filters.visibility}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    visibility: value as Visibility,
                  }))
                }
              >
                <Select.Trigger className="editor-select-trigger">
                  <Select.Value>
                    {
                      visibilityOptions.find(
                        (o) => o.value === filters.visibility,
                      )?.label
                    }
                  </Select.Value>
                  <Select.Icon>
                    <ChevronDown size={14} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="editor-select-menu"
                    position="popper"
                    sideOffset={6}
                    collisionPadding={12}
                  >
                    <Select.Viewport>
                      {visibilityOptions.map(({ value, label, icon: Icon }) => (
                        <Select.Item
                          key={value}
                          value={value}
                          className="editor-select-option"
                        >
                          <Icon size={14} />
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
            </label>
          )}
          <label className="lists-toolbar-select">
            <span>{tri(lang, "Ordenar", "Sort", "Ordenar")}</span>
            <Select.Root
              value={filters.sort}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  sort: value as ListSort,
                }))
              }
            >
              <Select.Trigger className="editor-select-trigger">
                <Select.Value>
                  {sortOptions.find((o) => o.value === filters.sort)?.label}
                </Select.Value>
                <Select.Icon>
                  <ChevronDown size={14} />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="editor-select-menu"
                  position="popper"
                  sideOffset={6}
                  collisionPadding={12}
                >
                  <Select.Viewport>
                    {sortOptions.map(({ value, label, icon: Icon }) => (
                      <Select.Item
                        key={value}
                        value={value}
                        className="editor-select-option"
                      >
                        <Icon size={14} />
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
          </label>
          {filtersActive && (
            <button
              type="button"
              className="lists-clear-filters"
              onClick={() => {
                setQuery("");
                setFilters(DEFAULTS);
              }}
            >
              <X size={13} />
              {t.clearFilters}
            </button>
          )}
        </div>
      </header>

      {rows.length > 0 && (
        <div className="lists-row" aria-busy={loading || undefined}>
          {rows.map((list) => (
            <ListPreviewCard
              key={list.id}
              list={{
                id: list.id,
                publicId: list.publicId,
                name: list.name,
                description: list.description,
                visibility: list.visibility,
                ranked: list.ranked,
                kind: list.kind,
                count: list.count,
              }}
              covers={list.covers}
              tierRows={list.tierRows}
              lang={lang}
              likes={list.likes}
              likedByViewer={list.likedByViewer}
              comments={list.comments}
            />
          ))}
        </div>
      )}

      {!rows.length && !loading && (
        <p className="lists-search-empty">
          {tri(
            lang,
            "Nenhuma lista corresponde a este filtro.",
            "No lists match this filter.",
            "Ninguna lista coincide con este filtro.",
          )}
        </p>
      )}

      {!done && rows.length > 0 && (
        <div className="load-more-row">
          <button type="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <LoaderCircle className="spin" size={15} aria-hidden />
            ) : (
              <Plus size={15} aria-hidden />
            )}
            {loadingMore ? t.loading : t.loadMore}
          </button>
        </div>
      )}

      {error && (
        <p className="lists-search-empty" role="alert">
          {t.couldNotLoad}
        </p>
      )}
    </section>
  );
}
