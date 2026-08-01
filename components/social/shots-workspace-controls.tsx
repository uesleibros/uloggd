"use client";

import {
  Gamepad2,
  RotateCcw,
  ArrowDownWideNarrow,
  EyeOff,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchSubmit } from "@/components/search-submit";
import { FilterSelect, type FilterOption } from "./filter-select";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Filters for the screenshots workspace.
 *
 * Deliberately the same shape as the reviews controls, down to the icon sizes:
 * these two pages sit one click apart in the sidebar, and a filter row that is
 * nearly but not quite the same reads as a mistake rather than as a variation.
 * The dropdown itself is the same component, not a copy.
 *
 * Filters compose instead of replacing each other, so narrowing by game does
 * not silently discard the search someone typed.
 */
export type ShotsFilterState = {
  game: string;
  spoilers: "all" | "safe" | "spoilers";
  order: "new" | "old";
  query: string;
};

export function ShotsWorkspaceControls({
  lang,
  state,
  games,
}: {
  lang: UiLang;
  state: ShotsFilterState;
  games: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(state.query);

  function navigate(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) merged.delete(key);
      else merged.set(key, value);
    }
    // Any filter change starts from the first page: staying on page four of a
    // result set that no longer has four pages shows nothing.
    merged.delete("page");
    const search = merged.toString();
    router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  const activeFilters =
    (state.game !== "all" ? 1 : 0) +
    (state.spoilers !== "all" ? 1 : 0) +
    (state.order !== "new" ? 1 : 0) +
    (state.query ? 1 : 0);

  return (
    <section
      className="reviews-workbench"
      aria-label={tri(
        lang,
        "Filtros das capturas",
        "Screenshot filters",
        "Filtros de capturas",
      )}
    >
      <form
        className="reviews-search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ q: query.trim() || null });
        }}
      >
        <Search size={15} aria-hidden />
        <label htmlFor="shots-query" className="sr-only">
          {tri(
            lang,
            "Buscar capturas",
            "Search screenshots",
            "Buscar capturas",
          )}
        </label>
        <input
          id="shots-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tri(
            lang,
            "Jogo ou descrição…",
            "Game or description…",
            "Juego o descripción…",
          )}
          maxLength={80}
        />
        <SearchSubmit lang={lang} />
      </form>

      <div className="reviews-filter-row">
        {games.length > 1 && (
          <FilterSelect
            icon={<Gamepad2 size={14} />}
            label={tri(lang, "Jogo", "Game", "Juego")}
            value={state.game}
            options={games}
            onChange={(value) =>
              navigate({ game: value === "all" ? null : value })
            }
          />
        )}
        <FilterSelect
          icon={<EyeOff size={14} />}
          label={tri(lang, "Spoilers", "Spoilers", "Spoilers")}
          value={state.spoilers}
          options={[
            { value: "all", label: tri(lang, "Todas", "All", "Todas") },
            {
              value: "safe",
              label: tri(lang, "Sem spoiler", "Spoiler-free", "Sin spoiler"),
            },
            {
              value: "spoilers",
              label: tri(lang, "Com spoiler", "With spoilers", "Con spoiler"),
            },
          ]}
          onChange={(value) =>
            navigate({ spoilers: value === "all" ? null : value })
          }
        />
        <FilterSelect
          icon={<ArrowDownWideNarrow size={14} />}
          label={tri(lang, "Ordem", "Order", "Orden")}
          value={state.order}
          options={[
            {
              value: "new",
              label: tri(lang, "Mais recentes", "Newest", "Más recientes"),
            },
            {
              value: "old",
              label: tri(lang, "Mais antigas", "Oldest", "Más antiguas"),
            },
          ]}
          onChange={(value) =>
            navigate({ sort: value === "new" ? null : value })
          }
        />
        {activeFilters > 0 && (
          <button
            type="button"
            className="reviews-clear"
            onClick={() => {
              setQuery("");
              router.push(pathname, { scroll: false });
            }}
          >
            <RotateCcw size={14} />
            {tri(lang, "Limpar", "Clear", "Limpiar")}
          </button>
        )}
      </div>
    </section>
  );
}
