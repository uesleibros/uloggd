"use client";

import * as Select from "@radix-ui/react-select";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type {
  CatalogGame,
  CatalogOption,
  CatalogSearchFilters,
  CatalogSearchOptions,
} from "@/lib/igdb";
import { QuickGameCard } from "./library/quick-game-card";

type SavedState = {
  status:
    "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
} | null;

function OptionGroup({
  title,
  param,
  options,
  selected,
  onChange,
  searchable = false,
  initiallyOpen = false,
  lang,
}: {
  title: string;
  param: string;
  options: CatalogOption[];
  selected: number[];
  onChange: (param: string, values: number[]) => void;
  searchable?: boolean;
  initiallyOpen?: boolean;
  lang: "pt-BR" | "en";
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? options.filter((option) =>
          [option.name, option.abbreviation, option.group]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(normalized)),
        )
      : options;
  }, [options, query]);
  return (
    <details className="catalog-filter-group" open={initiallyOpen}>
      <summary>
        <span>{title}</span>
        <span>
          {selected.length > 0 && <b>{selected.length}</b>}
          <ChevronDown size={14} />
        </span>
      </summary>
      <div>
        {searchable && (
          <label className="catalog-filter-search">
            <Search size={13} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                lang === "pt-BR" ? "Filtrar opções" : "Filter options"
              }
            />
          </label>
        )}
        <div className="catalog-filter-options">
          {visible.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} data-selected={checked || undefined}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      param,
                      checked
                        ? selected.filter((id) => id !== option.id)
                        : [...selected, option.id],
                    )
                  }
                />
                <span className="catalog-checkbox">
                  <Check size={11} />
                </span>
                <span>
                  <strong>{option.name}</strong>
                  {(option.abbreviation || option.group) && (
                    <small>
                      {[option.abbreviation, option.group]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  )}
                </span>
              </label>
            );
          })}
          {visible.length === 0 && (
            <p>
              {lang === "pt-BR"
                ? "Nenhuma opção encontrada."
                : "No options found."}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}

function CatalogSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="catalog-sort-trigger" aria-label={label}>
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={13} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="catalog-sort-menu"
          position="popper"
          sideOffset={6}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="catalog-sort-option"
                key={option.value}
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={13} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function paginationItems(current: number, total: number) {
  const pages = new Set([1, total]);
  for (let page = current - 2; page <= current + 2; page += 1) {
    if (page > 0 && page <= total) pages.add(page);
  }
  const ordered = [...pages].sort((a, b) => a - b);
  return ordered.flatMap<number | string>((page, index) => {
    const previous = ordered[index - 1];
    return previous && page - previous > 1
      ? [`gap-${previous}-${page}`, page]
      : [page];
  });
}

export function CatalogSearchWorkspace({
  lang,
  filters,
  options,
  games,
  total,
  totalPages,
  saved,
  enabled,
}: {
  lang: "pt-BR" | "en";
  filters: CatalogSearchFilters;
  options: CatalogSearchOptions;
  games: CatalogGame[];
  total: number;
  totalPages: number;
  saved: Record<number, SavedState>;
  enabled: boolean;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.query);

  function navigate(
    changes: Record<string, string | number | null>,
    push = false,
  ) {
    const params = new URLSearchParams(window.location.search);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "" || value === 0) params.delete(key);
      else params.set(key, String(value));
    });
    if (!("page" in changes)) params.delete("page");
    const href = `${pathname}${params.size ? `?${params}` : ""}`;
    startTransition(() =>
      push ? router.push(href) : router.replace(href, { scroll: false }),
    );
  }

  function updateArray(param: string, values: number[]) {
    navigate({ [param]: values.length ? values.join(",") : null });
  }

  const selectedChips = useMemo(() => {
    const groups: [
      keyof Pick<
        CatalogSearchFilters,
        "genres" | "platforms" | "themes" | "modes" | "types"
      >,
      CatalogOption[],
    ][] = [
      ["genres", options.genres],
      ["platforms", options.platforms],
      ["themes", options.themes],
      ["modes", options.modes],
      ["types", options.types],
    ];
    return groups.flatMap(([key, list]) =>
      filters[key].map((id) => ({
        key,
        id,
        label: list.find((item) => item.id === id)?.name ?? String(id),
      })),
    );
  }, [filters, options]);

  const activeCount =
    selectedChips.length +
    Number(filters.yearFrom !== null) +
    Number(filters.yearTo !== null) +
    Number(filters.ratingMin !== null) +
    Number(filters.ratingCountMin !== null);
  const sortOptions = [
    { value: "popular", label: pt ? "Mais populares" : "Most popular" },
    { value: "rating", label: pt ? "Melhor avaliados" : "Highest rated" },
    { value: "newest", label: pt ? "Mais recentes" : "Newest" },
    { value: "oldest", label: pt ? "Mais antigos" : "Oldest" },
    { value: "hype", label: pt ? "Mais aguardados" : "Most anticipated" },
    { value: "name", label: pt ? "Nome A–Z" : "Name A–Z" },
  ];

  return (
    <main className="catalog-search-page" data-pending={pending || undefined}>
      <header className="catalog-search-hero">
        <h1>
          {pt ? "Encontre exatamente o que jogar" : "Find exactly what to play"}
        </h1>
        <p>
          {pt
            ? "Cruze plataformas, gêneros, temas, modos, época e recepção em todo o catálogo da IGDB."
            : "Cross platforms, genres, themes, modes, era, and reception across the IGDB catalog."}
        </p>
        <form
          className="catalog-search-main-form"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: query.trim() || null });
          }}
        >
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              pt
                ? "Nome do jogo, edição ou expansão…"
                : "Game, edition, or expansion name…"
            }
            aria-label={pt ? "Buscar jogos" : "Search games"}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={pt ? "Limpar" : "Clear"}
            >
              <X size={17} />
            </button>
          )}
          <button type="submit">{pt ? "Buscar" : "Search"}</button>
        </form>
        <div className="catalog-search-signals">
          <span>IGDB</span>
          <span>
            {pt ? "Filtros persistem na URL" : "Filters persist in the URL"}
          </span>
          <span>{pt ? "24 jogos por página" : "24 games per page"}</span>
        </div>
      </header>

      {selectedChips.length > 0 && (
        <div
          className="catalog-active-filters"
          aria-label={pt ? "Filtros ativos" : "Active filters"}
        >
          {selectedChips.map((chip) => (
            <button
              type="button"
              key={`${chip.key}-${chip.id}`}
              onClick={() =>
                updateArray(
                  chip.key,
                  filters[chip.key].filter((id) => id !== chip.id),
                )
              }
            >
              {chip.label} <X size={12} />
            </button>
          ))}
          <Link href={pathname}>{pt ? "Limpar tudo" : "Clear all"}</Link>
        </div>
      )}

      <div className="catalog-search-workspace">
        <details className="catalog-filter-shell" open>
          <summary>
            <span>{pt ? "Filtros avançados" : "Advanced filters"}</span>
            {activeCount > 0 && <b>{activeCount}</b>}
            <ChevronDown size={15} />
          </summary>
          <aside>
            <div className="catalog-filter-heading">
              <div>
                <span>{pt ? "REFINE A BUSCA" : "REFINE SEARCH"}</span>
                <strong>{pt ? "Filtros" : "Filters"}</strong>
              </div>
              {activeCount > 0 && (
                <Link href={pathname}>{pt ? "Limpar" : "Clear"}</Link>
              )}
            </div>
            <OptionGroup
              title={pt ? "Plataformas e consoles" : "Platforms & consoles"}
              param="platforms"
              options={options.platforms}
              selected={filters.platforms}
              onChange={updateArray}
              searchable
              initiallyOpen
              lang={lang}
            />
            <OptionGroup
              title={pt ? "Gêneros" : "Genres"}
              param="genres"
              options={options.genres}
              selected={filters.genres}
              onChange={updateArray}
              searchable
              initiallyOpen
              lang={lang}
            />
            <OptionGroup
              title={pt ? "Temas" : "Themes"}
              param="themes"
              options={options.themes}
              selected={filters.themes}
              onChange={updateArray}
              searchable
              lang={lang}
            />
            <OptionGroup
              title={pt ? "Modos de jogo" : "Game modes"}
              param="modes"
              options={options.modes}
              selected={filters.modes}
              onChange={updateArray}
              lang={lang}
            />
            <OptionGroup
              title={pt ? "Tipo de conteúdo" : "Content type"}
              param="types"
              options={options.types}
              selected={filters.types}
              onChange={updateArray}
              searchable
              lang={lang}
            />

            <section className="catalog-range-filter">
              <header>
                <span>{pt ? "Recepção" : "Reception"}</span>
              </header>
              <label>
                {pt ? "Nota mínima" : "Minimum score"}
                <input
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={filters.ratingMin ?? ""}
                  onBlur={(event) =>
                    navigate({ rating: event.target.value || null })
                  }
                  placeholder="0–100"
                />
              </label>
              <label>
                {pt ? "Mínimo de avaliações" : "Minimum ratings"}
                <input
                  type="number"
                  min="0"
                  defaultValue={filters.ratingCountMin ?? ""}
                  onBlur={(event) =>
                    navigate({ votes: event.target.value || null })
                  }
                  placeholder="ex: 100"
                />
              </label>
            </section>
            <section className="catalog-range-filter">
              <header>
                <span>{pt ? "Janela de lançamento" : "Release window"}</span>
              </header>
              <div>
                <label>
                  {pt ? "De" : "From"}
                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    defaultValue={filters.yearFrom ?? ""}
                    onBlur={(event) =>
                      navigate({ yearFrom: event.target.value || null })
                    }
                    placeholder="1950"
                  />
                </label>
                <label>
                  {pt ? "Até" : "To"}
                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    defaultValue={filters.yearTo ?? ""}
                    onBlur={(event) =>
                      navigate({ yearTo: event.target.value || null })
                    }
                    placeholder="2026"
                  />
                </label>
              </div>
            </section>
          </aside>
        </details>

        <section className="catalog-results-panel" aria-busy={pending}>
          <header className="catalog-results-heading">
            <div>
              <span>{pt ? "RESULTADOS" : "RESULTS"}</span>
              <h2>
                {filters.query
                  ? pt
                    ? `Jogos para “${filters.query}”`
                    : `Games for “${filters.query}”`
                  : pt
                    ? "Explore o catálogo"
                    : "Explore the catalog"}
              </h2>
              <p>
                {pt
                  ? `${total.toLocaleString("pt-BR")} encontrados · ${games.length} nesta página`
                  : `${total.toLocaleString("en-US")} found · ${games.length} on this page`}
              </p>
            </div>
            <CatalogSelect
              value={filters.sort}
              onChange={(value) =>
                navigate({ sort: value === "popular" ? null : value })
              }
              options={sortOptions}
              label={pt ? "Ordenar resultados" : "Sort results"}
            />
          </header>

          {games.length ? (
            <div className="catalog-results-grid" key={filters.page}>
              {games.map((game, index) => (
                <div
                  className="catalog-result-entry"
                  key={game.id}
                  style={{ "--result-index": index % 8 } as React.CSSProperties}
                >
                  <QuickGameCard
                    game={game}
                    initial={saved[game.id] ?? null}
                    lang={lang}
                    enabled={enabled}
                    spawndAvailable={game.spawndAvailable}
                    meta={[
                      game.releaseYear,
                      game.platforms[0],
                      game.rating ? `${game.rating}/100` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="catalog-results-empty">
              <h2>
                {pt
                  ? "Nenhum jogo nesse cruzamento"
                  : "No games in this combination"}
              </h2>
              <p>
                {pt
                  ? "Remova um filtro ou amplie o período para reencontrar o catálogo."
                  : "Remove a filter or widen the period to bring the catalog back."}
              </p>
              <Link href={pathname}>
                {pt ? "Limpar filtros" : "Clear filters"}
              </Link>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="catalog-pagination"
              aria-label={pt ? "Paginação" : "Pagination"}
            >
              <div className="catalog-pagination-summary">
                <strong>
                  {pt ? `Página ${filters.page}` : `Page ${filters.page}`}
                </strong>
                <span>{pt ? `de ${totalPages}` : `of ${totalPages}`}</span>
              </div>
              <div className="catalog-pagination-pages">
                <button
                  type="button"
                  disabled={filters.page === 1 || pending}
                  onClick={() => navigate({ page: null }, true)}
                >
                  {pt ? "Primeira" : "First"}
                </button>
                {paginationItems(filters.page, totalPages).map((item) =>
                  typeof item === "number" ? (
                    <button
                      type="button"
                      key={item}
                      aria-current={item === filters.page ? "page" : undefined}
                      disabled={pending}
                      onClick={() =>
                        navigate({ page: item === 1 ? null : item }, true)
                      }
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={item} aria-hidden>
                      …
                    </span>
                  ),
                )}
                <button
                  type="button"
                  disabled={filters.page === totalPages || pending}
                  onClick={() => navigate({ page: totalPages }, true)}
                >
                  {pt ? "Última" : "Last"}
                </button>
              </div>
              <form
                className="catalog-pagination-jump"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = new FormData(event.currentTarget).get("page");
                  const page = Math.max(
                    1,
                    Math.min(totalPages, Number(value) || 1),
                  );
                  navigate({ page: page === 1 ? null : page }, true);
                }}
              >
                <label htmlFor="catalog-jump-page">
                  {pt ? "Ir para" : "Go to"}
                </label>
                <input
                  id="catalog-jump-page"
                  type="number"
                  name="page"
                  min="1"
                  max={totalPages}
                  defaultValue={filters.page}
                  key={filters.page}
                />
                <button type="submit" disabled={pending}>
                  {pt ? "Ir" : "Go"}
                </button>
              </form>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
