"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Eye,
  EyeOff,
  Gamepad2,
  Layers3,
  LayoutList,
  LibraryBig,
  RotateCcw,
  Search,
  Star,
  StarOff,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";
import { SearchSubmit } from "@/components/search-submit";
import { ViewSwitch } from "@/components/view-switch";

import { FilterSelect, type FilterOption as Option } from "./filter-select";

export type ReviewWorkspaceState = {
  scope: "all" | "review" | "journey";
  game: string;
  rating: string;
  spoilers: string;
  order: string;
  view: "timeline" | "games";
  query: string;
};

export function ReviewWorkspaceControls({
  lang,
  state,
  games,
}: {
  lang: UiLang;
  state: ReviewWorkspaceState;
  games: Array<{ id: number; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const [query, setQuery] = useState(state.query);

  function navigate(changes: Record<string, string | null>) {
    const params = new URLSearchParams(current.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  const gameOptions: Option[] = [
    {
      value: "all",
      label: tri(lang, "Todos os jogos", "All games", "Todos los juegos"),
      icon: <Layers3 size={14} />,
    },
    // The same mark on every game: a per-game icon does not exist, and a menu
    // where only the first row has one reads as unfinished.
    ...games.map((game) => ({
      value: String(game.id),
      label: game.name,
      icon: <Gamepad2 size={14} />,
    })),
  ];
  const ratingOptions: Option[] = [
    {
      value: "all",
      label: tri(lang, "Todas as notas", "All ratings", "Todas las notas"),
      icon: <Layers3 size={14} />,
    },
    {
      value: "rated",
      label: tri(lang, "Com nota", "Rated", "Con nota"),
      icon: <Star size={14} />,
    },
    {
      value: "great",
      label: tri(lang, "4★ ou mais", "4★ and up", "4★ o más"),
      icon: <Star size={14} />,
    },
    {
      value: "positive",
      label: tri(lang, "3–3,5★", "3–3.5★", "3–3,5★"),
      icon: <Star size={14} />,
    },
    {
      value: "mixed",
      label: tri(lang, "2–2,5★", "2–2.5★", "2–2,5★"),
      icon: <Star size={14} />,
    },
    {
      value: "low",
      label: tri(lang, "Abaixo de 2★", "Below 2★", "Menos de 2★"),
      icon: <Star size={14} />,
    },
    {
      value: "unrated",
      label: tri(lang, "Sem nota", "Unrated", "Sin nota"),
      icon: <StarOff size={14} />,
    },
  ];
  const spoilerOptions: Option[] = [
    {
      value: "all",
      label: tri(
        lang,
        "Com e sem spoilers",
        "All spoiler states",
        "Con y sin spoilers",
      ),
      icon: <Layers3 size={14} />,
    },
    {
      value: "hide",
      label: tri(lang, "Ocultar spoilers", "Hide spoilers", "Ocultar spoilers"),
      icon: <Eye size={14} />,
    },
    {
      value: "only",
      label: tri(lang, "Somente spoilers", "Spoilers only", "Solo spoilers"),
      icon: <EyeOff size={14} />,
    },
  ];
  const orderOptions: Option[] = [
    {
      value: "recent",
      label: tri(lang, "Mais recentes", "Newest first", "Más recientes"),
      icon: <ArrowDownWideNarrow size={14} />,
    },
    {
      value: "oldest",
      label: tri(lang, "Mais antigas", "Oldest first", "Más antiguas"),
      icon: <ArrowUpNarrowWide size={14} />,
    },
    ...(state.scope === "review"
      ? [
          {
            value: "rating",
            icon: <Star size={14} />,
            label: tri(lang, "Maior nota", "Highest rating", "Mayor nota"),
          },
        ]
      : []),
  ];
  const activeFilters =
    (state.game !== "all" ? 1 : 0) +
    (state.rating !== "all" ? 1 : 0) +
    (state.spoilers !== "all" ? 1 : 0) +
    (state.order !== "recent" ? 1 : 0) +
    (state.query ? 1 : 0);

  return (
    <section
      className="reviews-workbench"
      aria-label={tri(
        lang,
        "Filtros das avaliações",
        "Review filters",
        "Filtros de reseñas",
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
        <label htmlFor="reviews-query" className="sr-only">
          {tri(
            lang,
            "Buscar no arquivo",
            "Search archive",
            "Buscar en el archivo",
          )}
        </label>
        <input
          id="reviews-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tri(
            lang,
            "Jogo, título, jornada ou texto…",
            "Game, title, journey, or text…",
            "Juego, título, recorrido o texto…",
          )}
          maxLength={80}
        />
        <SearchSubmit lang={lang} />
      </form>

      <div className="reviews-filter-row">
        <FilterSelect
          icon={<Gamepad2 size={14} />}
          label={tri(lang, "Jogo", "Game", "Juego")}
          value={state.game}
          options={gameOptions}
          onChange={(value) =>
            navigate({ game: value === "all" ? null : value })
          }
        />
        {state.scope !== "journey" && (
          <FilterSelect
            icon={<Star size={14} />}
            label={tri(lang, "Nota", "Rating", "Nota")}
            value={state.rating}
            options={ratingOptions}
            onChange={(value) =>
              navigate({ rating: value === "all" ? null : value })
            }
          />
        )}
        <FilterSelect
          label="Spoilers"
          value={state.spoilers}
          options={spoilerOptions}
          onChange={(value) =>
            navigate({ spoilers: value === "all" ? null : value })
          }
        />
        <FilterSelect
          label={tri(lang, "Ordem", "Order", "Orden")}
          value={state.order}
          options={orderOptions}
          onChange={(value) =>
            navigate({ order: value === "recent" ? null : value })
          }
        />
        <ViewSwitch
          value={state.view}
          label={tri(
            lang,
            "Modo de exibição",
            "Display mode",
            "Modo de visualización",
          )}
          items={[
            {
              value: "timeline",
              label: tri(lang, "Linha do tempo", "Timeline", "Cronología"),
              icon: <LayoutList size={15} />,
            },
            {
              value: "games",
              label: tri(
                lang,
                "Agrupar por jogo",
                "Group by game",
                "Agrupar por juego",
              ),
              icon: <LibraryBig size={15} />,
            },
          ]}
          onChange={(next) =>
            navigate({ view: next === "timeline" ? null : next })
          }
        />
        {activeFilters > 0 && (
          <button
            type="button"
            className="reviews-clear"
            onClick={() => {
              setQuery("");
              navigate({
                q: null,
                game: null,
                rating: null,
                spoilers: null,
                order: null,
              });
            }}
          >
            <RotateCcw size={14} />
            {tri(
              lang,
              `Limpar ${activeFilters}`,
              `Clear ${activeFilters}`,
              `Limpiar ${activeFilters}`,
            )}
          </button>
        )}
      </div>
    </section>
  );
}
