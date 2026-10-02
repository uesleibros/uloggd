"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronDown, Check } from "lucide-react";
import * as Select from "@/components/ui/select";
import { api, ApiError, isReadAccessFailure } from "@/lib/api-client";
import { useIgnoredGames } from "@/components/use-ignored-games";
import { Pagination } from "@/components/pagination";
import { SearchSubmit } from "@/components/search-submit";
import { LoadError } from "@/components/ui/load-error";
import {
  selectSeries,
  type SeriesAnswer,
  type SeriesFilter,
  type LibrarySeriesShelf,
} from "@/lib/series-view";
import { LibrarySeriesRowSkeleton } from "./library-series-row-skeleton";
import { LibrarySeriesRow } from "./library-series-row";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function LibrarySeriesWorkspace({ lang }: { lang: UiLang }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [answer, setAnswer] = useState<SeriesAnswer | null>(null);
  const [details, setDetails] = useState<Record<string, LibrarySeriesShelf>>(
    {},
  );
  const [limited, setLimited] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pageAttempt, setPageAttempt] = useState(0);
  const initialQuery = useRef(params.toString());
  const [pageFailure, setPageFailure] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    ignored,
    toggle,
    pending,
    failed: writeFailed,
  } = useIgnoredGames(answer?.ignored ?? [], { refreshOnSettled: false });
  const requested = params.get("filter");
  const filter: SeriesFilter =
    requested === "progress" || requested === "completed" ? requested : "all";
  const sort = params.get("sort") === "name" ? "name" : "progress";
  const query = params.get("q") ?? "";
  const view = selectSeries(answer?.index ?? [], ignored, {
    filter,
    query,
    sort,
    page: Number(params.get("page")),
  });
  const labels = {
    all: uiText(lang).allFeminine,
    progress: tri(lang, "Em andamento", "In progress", "En curso"),
    completed: tri(lang, "Concluídas", "Completed", "Completadas"),
  };
  const searchLabel = tri(
    lang,
    "Buscar série",
    "Search series",
    "Buscar serie",
  );
  const sortLabel = tri(
    lang,
    "Ordenar séries",
    "Sort series",
    "Ordenar series",
  );
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [params],
  );

  useEffect(() => {
    const controller = new AbortController();
    void api
      .get<SeriesAnswer>(
        `/library/series?${initialQuery.current}`,
        controller.signal,
      )
      .then((value) => {
        setAnswer(value);
        setDetails(
          Object.fromEntries(value.data.map((shelf) => [shelf.key, shelf])),
        );
        setFailed(false);
        setLimited(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLimited(error instanceof ApiError && error.code === "rate_limited");
        if (isReadAccessFailure(error)) {
          setAnswer(null);
          setDetails({});
        }
        setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  const missing = view.rows
    .filter((row) => !details[row.entry.key])
    .map((row) => row.entry.key)
    .join(",");
  useEffect(() => {
    if (!missing) return;
    const controller = new AbortController();
    void api
      .get<SeriesAnswer>(
        `/library/series?keys=${encodeURIComponent(missing)}`,
        controller.signal,
      )
      .then((value) => {
        setDetails((previous) => ({
          ...previous,
          ...Object.fromEntries(value.data.map((shelf) => [shelf.key, shelf])),
        }));
        setPageFailure(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLimited(error instanceof ApiError && error.code === "rate_limited");
        if (isReadAccessFailure(error)) {
          setAnswer(null);
          setDetails({});
          setFailed(true);
        } else setPageFailure(missing);
      });
    return () => controller.abort();
  }, [missing, pageAttempt]);

  function update(values: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    if (!("page" in values)) next.delete("page");
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    next.set("shelf", "series");
    window.history.pushState(null, "", `${pathname}?${next}`);
  }
  const retry = () => {
    if (answer && missing) {
      setPageFailure(null);
      setPageAttempt((value) => value + 1);
    } else {
      setFailed(false);
      setAttempt((value) => value + 1);
    }
  };
  const sortNames = {
    progress: tri(lang, "Progresso", "Progress", "Progreso"),
    name: uiText(lang).name,
  };
  return (
    <section
      className="library-series series-workspace"
      aria-label={tri(
        lang,
        "Progresso das séries",
        "Series progress",
        "Progreso de series",
      )}
      data-loaded={answer ? "true" : "false"}
      data-pagination-scope
      aria-busy={
        (!answer && !failed) || (Boolean(missing) && pageFailure !== missing)
      }
    >
      <header data-pagination-start>
        <h2>{tri(lang, "Séries", "Series", "Series")}</h2>
        <p>
          {tri(
            lang,
            "Acompanhe todas as séries da sua biblioteca. Backlog e desejos ainda não contam como jogados.",
            "Track every series in your library. Backlog and wishlist games do not count as played yet.",
            "Sigue todas las series de tu biblioteca. Pendientes y deseados aún no cuentan como jugados.",
          )}
        </p>
      </header>
      <nav
        className="game-page-nav app-tabs series-filters"
        aria-label={tri(
          lang,
          "Filtrar séries",
          "Filter series",
          "Filtrar series",
        )}
      >
        {(["all", "progress", "completed"] as const).map((item) => (
          <button
            key={item}
            type="button"
            data-active={filter === item || undefined}
            aria-pressed={filter === item}
            onClick={() => update({ filter: item === "all" ? null : item })}
          >
            {labels[item]}{" "}
            <span
              className={
                answer ? "app-tab-count" : "app-tab-count skeleton-block"
              }
              aria-hidden={!answer || undefined}
            >
              {answer ? view.counts[item] : " "}
            </span>
          </button>
        ))}
      </nav>
      <div className="series-workspace-controls">
        <form
          className="library-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (searchTimer.current) clearTimeout(searchTimer.current);
            update({
              q:
                String(
                  new FormData(event.currentTarget).get("q") ?? "",
                ).trim() || null,
            });
          }}
        >
          <Search size={15} aria-hidden />
          <input
            key={query}
            name="q"
            defaultValue={query}
            aria-label={searchLabel}
            placeholder={`${searchLabel}...`}
            maxLength={200}
            onChange={(event) => {
              if (searchTimer.current) clearTimeout(searchTimer.current);
              const value = event.currentTarget.value.trim();
              searchTimer.current = setTimeout(
                () => update({ q: value || null }),
                300,
              );
            }}
          />
          <SearchSubmit lang={lang} />
        </form>
        <Select.Root
          value={sort}
          onValueChange={(value) =>
            update({ sort: value === "name" ? "name" : null })
          }
        >
          <Select.Trigger
            className="library-sort-trigger"
            aria-label={sortLabel}
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
                {(["progress", "name"] as const).map((value) => (
                  <Select.Item
                    key={value}
                    value={value}
                    className="library-sort-option"
                  >
                    <Select.ItemText>{sortNames[value]}</Select.ItemText>
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
      {(failed || (pageFailure === missing && Boolean(missing))) && (
        <LoadError
          lang={lang}
          message={
            limited
              ? tri(
                  lang,
                  "O catálogo está temporariamente ocupado. Tente novamente em alguns instantes.",
                  "The catalogue is temporarily busy. Try again in a moment.",
                  "El catálogo está temporalmente ocupado. Inténtalo en unos instantes.",
                )
              : undefined
          }
          what={tri(lang, "as séries", "the series", "las series")}
          onRetry={retry}
        />
      )}
      {!answer && !failed && (
        <p role="status" className="sr-only">
          {tri(
            lang,
            "Carregando séries...",
            "Loading series...",
            "Cargando series...",
          )}
        </p>
      )}
      {answer && !view.rows.length && (
        <p className="series-workspace-empty" role="status">
          {!answer.index.length
            ? tri(
                lang,
                "Sua biblioteca ainda não tem jogos de uma série com mais de uma parte.",
                "Your library has no games from a series with more than one part yet.",
                "Tu biblioteca aún no tiene juegos de una serie con más de una parte.",
              )
            : query
              ? tri(
                  lang,
                  "Nenhuma série encontrada para esta busca.",
                  "No series match this search.",
                  "Ninguna serie coincide con esta búsqueda.",
                )
              : tri(
                  lang,
                  "Nenhuma série neste filtro.",
                  "No series in this filter.",
                  "Ninguna serie en este filtro.",
                )}
        </p>
      )}
      <ol className="library-series-list">
        {!answer &&
          !failed &&
          Array.from({ length: 6 }, (_, index) => (
            <LibrarySeriesRowSkeleton key={index} />
          ))}
        {view.rows.map(({ entry }) =>
          details[entry.key] ? (
            <LibrarySeriesRow
              key={entry.key}
              shelf={details[entry.key]}
              ignored={ignored}
              toggle={toggle}
              pending={pending}
              lang={lang}
            />
          ) : (
            <LibrarySeriesRowSkeleton key={entry.key} name={entry.name} />
          ),
        )}
      </ol>
      {writeFailed && (
        <p role="status">
          {tri(
            lang,
            "Não deu para salvar isso agora.",
            "That could not be saved right now.",
            "No se pudo guardar eso ahora.",
          )}
        </p>
      )}
      <Pagination
        page={view.page}
        totalPages={view.totalPages}
        lang={lang}
        onGo={(page) => update({ page: page === 1 ? null : String(page) })}
      />
    </section>
  );
}
