"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@/components/ui/select";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  CatalogGame,
  CatalogOption,
  CatalogSearchFilters,
  CatalogSearchOptions,
} from "@/lib/igdb";
import { QuickGameCard } from "./library/quick-game-card";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

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

type DraftArrayKey =
  | "genres"
  | "platforms"
  | "themes"
  | "modes"
  | "types"
  | "perspectives"
  | "publishers";

type FilterDraft = Pick<
  CatalogSearchFilters,
  | DraftArrayKey
  | "releaseStatus"
  | "ratedOnly"
  | "anticipatedOnly"
  | "yearFrom"
  | "yearTo"
  | "ratingMin"
  | "ratingCountMin"
>;

function draftFromFilters(filters: CatalogSearchFilters): FilterDraft {
  return {
    genres: filters.genres,
    platforms: filters.platforms,
    themes: filters.themes,
    modes: filters.modes,
    types: filters.types,
    perspectives: filters.perspectives,
    publishers: filters.publishers,
    releaseStatus: filters.releaseStatus,
    ratedOnly: filters.ratedOnly,
    anticipatedOnly: filters.anticipatedOnly,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    ratingMin: filters.ratingMin,
    ratingCountMin: filters.ratingCountMin,
  };
}

function emptyDraft(): FilterDraft {
  return {
    genres: [],
    platforms: [],
    themes: [],
    modes: [],
    types: [],
    perspectives: [],
    publishers: [],
    releaseStatus: "all",
    ratedOnly: false,
    anticipatedOnly: false,
    yearFrom: null,
    yearTo: null,
    ratingMin: null,
    ratingCountMin: null,
  };
}

function OptionGroup({
  title,
  param,
  options,
  selected,
  onChange,
  searchable = false,
  remoteSearch = false,
  initiallyOpen = false,
  lang,
}: {
  title: string;
  param: DraftArrayKey;
  options: CatalogOption[];
  selected: number[];
  onChange: (param: DraftArrayKey, values: number[]) => void;
  searchable?: boolean;
  remoteSearch?: boolean;
  initiallyOpen?: boolean;
  lang: UiLang;
}) {
  const [query, setQuery] = useState("");
  const [remoteOptions, setRemoteOptions] = useState<CatalogOption[]>([]);
  const [remotePending, setRemotePending] = useState(false);
  useEffect(() => {
    const normalized = query.trim();
    if (!remoteSearch || normalized.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRemotePending(true);
      try {
        const response = await fetch(
          `/api/igdb/publishers?q=${encodeURIComponent(normalized)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          results?: CatalogOption[];
        };
        if (response.ok) setRemoteOptions(payload.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setRemoteOptions([]);
      } finally {
        if (!controller.signal.aborted) setRemotePending(false);
      }
    }, 280);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, remoteSearch]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (remoteSearch && normalized.length >= 2) return remoteOptions;
    return normalized
      ? options.filter((option) =>
          [option.name, option.abbreviation, option.group]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(normalized)),
        )
      : options;
  }, [options, query, remoteOptions, remoteSearch]);
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
              placeholder={tri(
                lang,
                "Filtrar opções",
                "Filter options",
                "Filtrar opciones",
              )}
            />
          </label>
        )}
        <div
          className="catalog-filter-options"
          data-scroll={visible.length > 6 || undefined}
        >
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
              {remotePending ? (
                <>
                  <LoaderCircle className="spin" size={13} />
                  {tri(lang, "Buscando…", "Searching…", "Buscando…")}
                </>
              ) : (
                tri(
                  lang,
                  "Nenhuma opção encontrada.",
                  "No options found.",
                  "No se encontraron opciones.",
                )
              )}
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
  createMode = null,
}: {
  lang: UiLang;
  filters: CatalogSearchFilters;
  options: CatalogSearchOptions;
  games: CatalogGame[];
  total: number;
  totalPages: number;
  saved: Record<number, SavedState>;
  enabled: boolean;
  createMode?: "review" | null;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const router = useRouter();
  const pathname = usePathname();
  const pageRef = useRef<HTMLElement>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(() =>
    draftFromFilters(filters),
  );

  useEffect(() => {
    pageRef.current?.setAttribute("data-hydrated", "true");
  }, []);

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

  function updateDraftArray(param: DraftArrayKey, values: number[]) {
    setDraft((current) => ({ ...current, [param]: values }));
  }

  function applyFilters() {
    setFiltersOpen(false);
    navigate({
      genres: draft.genres.length ? draft.genres.join(",") : null,
      platforms: draft.platforms.length ? draft.platforms.join(",") : null,
      themes: draft.themes.length ? draft.themes.join(",") : null,
      modes: draft.modes.length ? draft.modes.join(",") : null,
      types: draft.types.length ? draft.types.join(",") : null,
      perspectives: draft.perspectives.length
        ? draft.perspectives.join(",")
        : null,
      publishers: draft.publishers.length ? draft.publishers.join(",") : null,
      release: draft.releaseStatus === "all" ? null : draft.releaseStatus,
      rated: draft.ratedOnly ? 1 : null,
      anticipated: draft.anticipatedOnly ? 1 : null,
      yearFrom: draft.yearFrom,
      yearTo: draft.yearTo,
      rating: draft.ratingMin,
      votes: draft.ratingCountMin,
    });
  }

  const selectedChips = useMemo(() => {
    const groups: [
      keyof Pick<
        CatalogSearchFilters,
        | "genres"
        | "platforms"
        | "themes"
        | "modes"
        | "types"
        | "perspectives"
        | "publishers"
      >,
      CatalogOption[],
    ][] = [
      ["genres", options.genres],
      ["platforms", options.platforms],
      ["themes", options.themes],
      ["modes", options.modes],
      ["types", options.types],
      ["perspectives", options.perspectives],
      ["publishers", options.publishers],
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
  const appliedCount =
    activeCount +
    Number(filters.releaseStatus !== "all") +
    Number(filters.ratedOnly) +
    Number(filters.anticipatedOnly);
  const draftCount =
    draft.genres.length +
    draft.platforms.length +
    draft.themes.length +
    draft.modes.length +
    draft.types.length +
    draft.perspectives.length +
    draft.publishers.length +
    Number(draft.releaseStatus !== "all") +
    Number(draft.ratedOnly) +
    Number(draft.anticipatedOnly) +
    Number(draft.yearFrom !== null) +
    Number(draft.yearTo !== null) +
    Number(draft.ratingMin !== null) +
    Number(draft.ratingCountMin !== null);
  const draftDirty =
    JSON.stringify(draft) !== JSON.stringify(draftFromFilters(filters));
  const sortOptions = [
    {
      value: "popular",
      label: tri(lang, "Mais populares", "Most popular", "Más populares"),
    },
    {
      value: "rating",
      label: tri(lang, "Melhor avaliados", "Highest rated", "Mejor valorados"),
    },
    {
      value: "newest",
      label: tri(lang, "Mais recentes", "Newest", "Más recientes"),
    },
    {
      value: "oldest",
      label: tri(lang, "Mais antigos", "Oldest", "Más antiguos"),
    },
    {
      value: "hype",
      label: tri(lang, "Mais aguardados", "Most anticipated", "Solo esperados"),
    },
    { value: "name", label: tri(lang, "Nome A–Z", "Name A–Z", "Nombre A–Z") },
  ];
  const activeSort =
    sortOptions.find((option) => option.value === filters.sort)?.label ??
    sortOptions[0].label;
  const scopeRows = [
    filters.yearFrom !== null || filters.yearTo !== null
      ? {
          label: tri(lang, "Lançamento", "Release", "Estado de lanzamiento"),
          value: `${filters.yearFrom ?? "…"}–${filters.yearTo ?? "…"}`,
        }
      : null,
    filters.ratingMin !== null
      ? {
          label: t.minimumScore,
          value: `${filters.ratingMin}/100`,
        }
      : null,
    filters.ratingCountMin !== null
      ? {
          label: tri(lang, "Avaliações", "Ratings", "Valoraciones"),
          value: `${filters.ratingCountMin.toLocaleString(lang)}+`,
        }
      : null,
    filters.releaseStatus !== "all"
      ? {
          label: tri(
            lang,
            "Lançamento",
            "Release status",
            "Estado de lanzamiento",
          ),
          value: filters.releaseStatus === "released" ? t.released : t.upcoming,
        }
      : null,
    filters.ratedOnly
      ? {
          label: t.reception,
          value: t.ratedOnly,
        }
      : null,
    filters.anticipatedOnly
      ? {
          label: tri(lang, "Interesse", "Interest", "Interés"),
          value: tri(
            lang,
            "Mais aguardados",
            "Anticipated only",
            "Solo esperados",
          ),
        }
      : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const scalarChips: {
    key: string;
    label: string;
    changes: Record<string, string | number | null>;
  }[] = [];
  if (filters.releaseStatus !== "all") {
    scalarChips.push({
      key: "release",
      label: filters.releaseStatus === "released" ? t.released : t.upcoming,
      changes: { release: null },
    });
  }
  if (filters.ratedOnly)
    scalarChips.push({
      key: "rated",
      label: t.ratedOnly,
      changes: { rated: null },
    });
  if (filters.anticipatedOnly)
    scalarChips.push({
      key: "anticipated",
      label: tri(
        lang,
        "Somente aguardados",
        "Anticipated only",
        "Solo esperados",
      ),
      changes: { anticipated: null },
    });
  if (filters.yearFrom !== null || filters.yearTo !== null)
    scalarChips.push({
      key: "years",
      label: `${filters.yearFrom ?? "…"}–${filters.yearTo ?? "…"}`,
      changes: { yearFrom: null, yearTo: null },
    });
  if (filters.ratingMin !== null)
    scalarChips.push({
      key: "rating",
      label: `${tri(lang, "Nota", "Score", "Nota")} ${filters.ratingMin}+`,
      changes: { rating: null },
    });
  if (filters.ratingCountMin !== null)
    scalarChips.push({
      key: "votes",
      label: `${filters.ratingCountMin.toLocaleString(lang)}+ ${tri(lang, "avaliações", "ratings", "valoraciones")}`,
      changes: { votes: null },
    });

  return (
    <main
      ref={pageRef}
      className="catalog-search-page"
      data-pending={pending || undefined}
    >
      <header className="catalog-search-hero">
        <h1>
          {createMode === "review"
            ? tri(
                lang,
                "Qual jogo você quer avaliar?",
                "Which game do you want to review?",
                "¿Qué juego quieres reseñar?",
              )
            : tri(
                lang,
                "Encontre exatamente o que jogar",
                "Find exactly what to play",
                "Encuentra exactamente qué jugar",
              )}
        </h1>
        <p>
          {createMode === "review"
            ? tri(
                lang,
                "Selecione uma capa para abrir o estúdio de avaliação.",
                "Select a cover to open the review studio.",
                "Selecciona una portada para abrir el estudio de reseñas.",
              )
            : tri(
                lang,
                "Cruze plataformas, gêneros, temas, modos, época e recepção para encontrar o jogo certo.",
                "Cross platforms, genres, themes, modes, era, and reception to find the right game.",
                "Cruza plataformas, géneros, temas, modos, época y recepción para encontrar el juego adecuado.",
              )}
        </p>
        <form
          className="catalog-search-main-form"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: query.trim() || null });
          }}
        >
          <label className="catalog-search-main-field">
            <Search size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tri(
                lang,
                "Nome do jogo, edição ou expansão…",
                "Game, edition, or expansion name…",
                "Nombre del juego, edición o expansión…",
              )}
              aria-label={tri(
                lang,
                "Buscar jogos",
                "Search games",
                "Buscar juegos",
              )}
            />
          </label>
          <button
            type="button"
            className="catalog-search-clear"
            data-hidden={!query || undefined}
            tabIndex={query ? undefined : -1}
            aria-hidden={!query || undefined}
            onClick={() => setQuery("")}
            aria-label={t.clear}
          >
            <X size={17} />
          </button>
          <button type="submit">{t.search}</button>
        </form>
        <div className="catalog-search-signals">
          <span>
            {tri(
              lang,
              "Filtros persistem na URL",
              "Filters persist in the URL",
              "Los filtros se guardan en la URL",
            )}
          </span>
          <span>
            {tri(
              lang,
              "24 jogos por página",
              "24 games per page",
              "24 juegos por página",
            )}
          </span>
        </div>
      </header>

      {(selectedChips.length > 0 || scalarChips.length > 0) && (
        <div
          className="catalog-active-filters"
          aria-label={tri(
            lang,
            "Filtros ativos",
            "Active filters",
            "Filtros activos",
          )}
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
          {scalarChips.map((chip) => (
            <button
              type="button"
              key={chip.key}
              onClick={() => navigate(chip.changes)}
            >
              {chip.label} <X size={12} />
            </button>
          ))}
          <Link href={pathname}>
            {tri(lang, "Limpar tudo", "Clear all", "Limpiar todo")}
          </Link>
        </div>
      )}

      <Dialog.Root
        open={filtersOpen}
        onOpenChange={(open) => {
          if (open) setDraft(draftFromFilters(filters));
          setFiltersOpen(open);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="catalog-filter-overlay" />
          <Dialog.Content
            className="catalog-filter-dialog"
            aria-describedby={undefined}
          >
            <header className="catalog-filter-dialog-head">
              <div>
                <span>
                  {tri(
                    lang,
                    "REFINE A BUSCA",
                    "REFINE SEARCH",
                    "AFINA LA BÚSQUEDA",
                  )}
                </span>
                <Dialog.Title>{t.advancedFilters}</Dialog.Title>
              </div>
              <div className="catalog-filter-dialog-head-actions">
                {draftCount > 0 && (
                  <button
                    type="button"
                    className="catalog-filter-clear"
                    onClick={() => setDraft(emptyDraft())}
                  >
                    {t.clear}
                  </button>
                )}
                <Dialog.Close
                  className="catalog-filter-dialog-close"
                  aria-label={t.close}
                >
                  <X size={17} />
                </Dialog.Close>
              </div>
            </header>
            <div className="catalog-filter-dialog-body">
              <section className="catalog-choice-filter">
                <header>
                  {tri(
                    lang,
                    "Situação de lançamento",
                    "Release status",
                    "Estado de lanzamiento",
                  )}
                </header>
                <div className="catalog-segmented-filter">
                  {[
                    ["all", t.all],
                    ["released", tri(lang, "Lançados", "Released", "Lanzados")],
                    [
                      "upcoming",
                      tri(lang, "Em breve", "Upcoming", "Muy pronto"),
                    ],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      data-selected={draft.releaseStatus === value || undefined}
                    >
                      <input
                        type="radio"
                        name="release-status"
                        checked={draft.releaseStatus === value}
                        onChange={() =>
                          setDraft((current) => ({
                            ...current,
                            releaseStatus:
                              value as FilterDraft["releaseStatus"],
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="catalog-boolean-filters">
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.ratedOnly}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          ratedOnly: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      <i />
                    </span>
                    <b>
                      {tri(
                        lang,
                        "Somente jogos avaliados",
                        "Rated games only",
                        "Solo juegos valorados",
                      )}
                    </b>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.anticipatedOnly}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          anticipatedOnly: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      <i />
                    </span>
                    <b>
                      {tri(
                        lang,
                        "Somente jogos aguardados",
                        "Anticipated games only",
                        "Solo juegos esperados",
                      )}
                    </b>
                  </label>
                </div>
              </section>
              <OptionGroup
                title={tri(
                  lang,
                  "Plataformas e consoles",
                  "Platforms & consoles",
                  "Plataformas y consolas",
                )}
                param="platforms"
                options={options.platforms}
                selected={draft.platforms}
                onChange={updateDraftArray}
                searchable
                initiallyOpen
                lang={lang}
              />
              <OptionGroup
                title={tri(lang, "Gêneros", "Genres", "Géneros")}
                param="genres"
                options={options.genres}
                selected={draft.genres}
                onChange={updateDraftArray}
                searchable
                lang={lang}
              />
              <OptionGroup
                title={tri(
                  lang,
                  "Perspectiva",
                  "Player perspective",
                  "Perspectiva",
                )}
                param="perspectives"
                options={options.perspectives}
                selected={draft.perspectives}
                onChange={updateDraftArray}
                lang={lang}
              />
              <OptionGroup
                title={tri(lang, "Temas", "Themes", "Temas")}
                param="themes"
                options={options.themes}
                selected={draft.themes}
                onChange={updateDraftArray}
                searchable
                lang={lang}
              />
              <OptionGroup
                title={tri(
                  lang,
                  "Modos de jogo",
                  "Game modes",
                  "Modos de juego",
                )}
                param="modes"
                options={options.modes}
                selected={draft.modes}
                onChange={updateDraftArray}
                lang={lang}
              />
              <OptionGroup
                title={tri(lang, "Publicação", "Publisher", "Distribuidora")}
                param="publishers"
                options={options.publishers}
                selected={draft.publishers}
                onChange={updateDraftArray}
                searchable
                remoteSearch
                lang={lang}
              />
              <OptionGroup
                title={tri(
                  lang,
                  "Tipo de conteúdo",
                  "Content type",
                  "Tipo de contenido",
                )}
                param="types"
                options={options.types}
                selected={draft.types}
                onChange={updateDraftArray}
                searchable
                lang={lang}
              />

              <section className="catalog-range-filter">
                <header>
                  <span>{t.reception}</span>
                </header>
                <label>
                  {t.minimumScore}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={draft.ratingMin ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        ratingMin: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                    placeholder="0–100"
                  />
                </label>
                <label>
                  {tri(
                    lang,
                    "Mínimo de avaliações",
                    "Minimum ratings",
                    "Mínimo de valoraciones",
                  )}
                  <input
                    type="number"
                    min="0"
                    value={draft.ratingCountMin ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        ratingCountMin: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                    placeholder="ex: 100"
                  />
                </label>
              </section>
              <section className="catalog-range-filter">
                <header>
                  <span>
                    {tri(
                      lang,
                      "Janela de lançamento",
                      "Release window",
                      "Ventana de lanzamiento",
                    )}
                  </span>
                </header>
                <div>
                  <label>
                    {t.from}
                    <input
                      type="number"
                      min="1950"
                      max="2100"
                      value={draft.yearFrom ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          yearFrom: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                      placeholder="1950"
                    />
                  </label>
                  <label>
                    {tri(lang, "Até", "To", "Hasta")}
                    <input
                      type="number"
                      min="1950"
                      max="2100"
                      value={draft.yearTo ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          yearTo: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                      placeholder="2026"
                    />
                  </label>
                </div>
              </section>
            </div>
            <footer className="catalog-filter-dialog-actions">
              <span>
                {draftDirty
                  ? tri(
                      lang,
                      "Alterações pendentes",
                      "Pending changes",
                      "Cambios pendientes",
                    )
                  : pt
                    ? `${appliedCount} filtro(s) ativo(s)`
                    : `${appliedCount} active filter(s)`}
              </span>
              <button
                type="button"
                disabled={!draftDirty || pending}
                onClick={applyFilters}
              >
                {pending
                  ? t.applying
                  : tri(
                      lang,
                      "Aplicar filtros",
                      "Apply filters",
                      "Aplicar filtros",
                    )}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>

        <div className="catalog-search-workspace">
          <section className="catalog-results-panel" aria-busy={pending}>
            <header className="catalog-results-heading">
              <div className="catalog-results-heading-copy">
                <span>{tri(lang, "RESULTADOS", "RESULTS", "RESULTADOS")}</span>
                <h2>
                  {filters.query
                    ? pt
                      ? `Jogos para “${filters.query}”`
                      : `Games for “${filters.query}”`
                    : tri(
                        lang,
                        "Explore o catálogo",
                        "Explore the catalog",
                        "Explora el catálogo",
                      )}
                </h2>
                <p>
                  {pt
                    ? `${total.toLocaleString("pt-BR")} encontrados · ${games.length} nesta página`
                    : `${total.toLocaleString("en-US")} found · ${games.length} on this page`}
                </p>
              </div>
              <div className="catalog-results-tools">
                <Dialog.Trigger asChild>
                  <button type="button" className="catalog-filter-trigger">
                    <SlidersHorizontal size={15} />
                    <span>{t.advancedFilters}</span>
                    {appliedCount > 0 && <b>{appliedCount}</b>}
                  </button>
                </Dialog.Trigger>
                <CatalogSelect
                  value={filters.sort}
                  onChange={(value) =>
                    navigate({ sort: value === "popular" ? null : value })
                  }
                  options={sortOptions}
                  label={tri(
                    lang,
                    "Ordenar resultados",
                    "Sort results",
                    "Ordenar resultados",
                  )}
                />
              </div>
            </header>

            {games.length ? (
              <div className="catalog-results-grid" key={filters.page}>
                {games.map((game, index) => (
                  <div
                    className="catalog-result-entry"
                    key={game.id}
                    style={
                      { "--result-index": index % 8 } as React.CSSProperties
                    }
                  >
                    <QuickGameCard
                      game={game}
                      initial={saved[game.id] ?? null}
                      lang={lang}
                      enabled={enabled}
                      spawndAvailable={game.spawndAvailable}
                      hrefSuffix={createMode === "review" ? "?review=1" : ""}
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
                <span aria-hidden>
                  <SearchX size={22} />
                </span>
                <h2>
                  {tri(
                    lang,
                    "Nenhum jogo nesse cruzamento",
                    "No games in this combination",
                    "Ningún juego en esta combinación",
                  )}
                </h2>
                <p>
                  {tri(
                    lang,
                    "Remova um filtro ou amplie o período para reencontrar o catálogo.",
                    "Remove a filter or widen the period to bring the catalog back.",
                    "Quita un filtro o amplía el periodo para recuperar el catálogo.",
                  )}
                </p>
                <Link href={pathname}>{t.clearFilters}</Link>
              </div>
            )}

            {totalPages > 1 && (
              <nav
                className="catalog-pagination"
                aria-label={tri(lang, "Paginação", "Pagination", "Paginación")}
              >
                <div className="catalog-pagination-summary">
                  <strong>
                    {tri(
                      lang,
                      `Página ${filters.page}`,
                      `Page ${filters.page}`,
                      `Página ${filters.page}`,
                    )}
                  </strong>
                  <span>
                    {tri(
                      lang,
                      `de ${totalPages}`,
                      `of ${totalPages}`,
                      `de ${totalPages}`,
                    )}
                  </span>
                </div>
                <div className="catalog-pagination-pages">
                  <button
                    type="button"
                    disabled={filters.page === 1 || pending}
                    onClick={() => navigate({ page: null }, true)}
                  >
                    {tri(lang, "Primeira", "First", "Primera")}
                  </button>
                  {paginationItems(filters.page, totalPages).map((item) =>
                    typeof item === "number" ? (
                      <button
                        type="button"
                        key={item}
                        aria-current={
                          item === filters.page ? "page" : undefined
                        }
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
                    {tri(lang, "Última", "Last", "Última")}
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
                    {tri(lang, "Ir para", "Go to", "Ir a")}
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
                    {tri(lang, "Ir", "Go", "Ir")}
                  </button>
                </form>
              </nav>
            )}
          </section>

          <aside
            className="catalog-context-rail"
            aria-label={tri(
              lang,
              "Resumo da busca",
              "Search summary",
              "Resumen de la búsqueda",
            )}
            key={`${filters.page}-${filters.sort}-${appliedCount}`}
          >
            <section className="catalog-context-total">
              <span>
                {tri(
                  lang,
                  "CATÁLOGO ENCONTRADO",
                  "CATALOG FOUND",
                  "CATÁLOGO ENCONTRADO",
                )}
              </span>
              <strong>{total.toLocaleString(lang)}</strong>
              <small>
                {tri(
                  lang,
                  "jogos correspondem à busca",
                  "games match this search",
                  "juegos coinciden con la búsqueda",
                )}
              </small>
            </section>

            <section className="catalog-context-card">
              <header>
                <strong>
                  {tri(lang, "Sua busca", "Your search", "Tu búsqueda")}
                </strong>
                {appliedCount > 0 && <span>{appliedCount}</span>}
              </header>
              <dl>
                <div>
                  <dt>{tri(lang, "Ordenação", "Sorting", "Ordenación")}</dt>
                  <dd>{activeSort}</dd>
                </div>
                {scopeRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              {selectedChips.length > 0 ? (
                <div className="catalog-context-chips">
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
                      <span>{chip.label}</span>
                      <X size={12} />
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  {tri(
                    lang,
                    "Nenhum filtro de categoria aplicado.",
                    "No category filters applied.",
                    "Ningún filtro de categoría aplicado.",
                  )}
                </p>
              )}
              {appliedCount > 0 && (
                <Link href={pathname}>{t.clearFilters}</Link>
              )}
            </section>

            {totalPages > 1 && (
              <section className="catalog-context-card catalog-context-navigation">
                <div>
                  <strong>
                    {tri(
                      lang,
                      `Página ${filters.page}`,
                      `Page ${filters.page}`,
                      `Página ${filters.page}`,
                    )}
                  </strong>
                  <span>
                    {tri(
                      lang,
                      `de ${totalPages}`,
                      `of ${totalPages}`,
                      `de ${totalPages}`,
                    )}
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={filters.page === 1 || pending}
                    onClick={() =>
                      navigate({ page: filters.page - 1 || null }, true)
                    }
                  >
                    {t.previous}
                  </button>
                  <button
                    type="button"
                    disabled={filters.page === totalPages || pending}
                    onClick={() => navigate({ page: filters.page + 1 }, true)}
                  >
                    {t.next}
                  </button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </Dialog.Root>
    </main>
  );
}
