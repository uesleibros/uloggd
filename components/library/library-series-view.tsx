"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import { useIgnoredGames } from "@/components/use-ignored-games";
import type { LibrarySeriesShelf } from "@/lib/series-view";
import { LibrarySeriesRow } from "./library-series-row";
import { tri, type UiLang } from "@/lib/ui-text";
export type { LibrarySeriesShelf } from "@/lib/series-view";

export function LibrarySeriesView({
  shelves,
  ignored: initial,
  lang,
}: {
  shelves: LibrarySeriesShelf[];
  ignored: number[];
  lang: UiLang;
}) {
  const { ignored, toggle, pending, failed } = useIgnoredGames(initial, {
    refreshOnSettled: false,
  });
  const pathname = usePathname();
  const params = useSearchParams();
  if (!shelves.length) return null;
  return (
    <section className="library-series">
      <header>
        <h2>
          <Layers size={14} aria-hidden />{" "}
          {tri(lang, "Séries", "Series", "Series")}
        </h2>
        <p>
          {tri(
            lang,
            "As séries com mais de uma parte na sua biblioteca. Versões do mesmo jogo contam uma vez.",
            "Series with more than one part in your library. Versions of the same game count once.",
            "Series con más de una parte en tu biblioteca. Versiones del mismo juego cuentan una vez.",
          )}
        </p>
      </header>
      <ol className="library-series-list">
        {shelves.map((shelf) => (
          <LibrarySeriesRow
            key={shelf.key}
            shelf={shelf}
            ignored={ignored}
            toggle={toggle}
            pending={pending}
            lang={lang}
          />
        ))}
      </ol>
      {failed && (
        <p role="status">
          {tri(
            lang,
            "Não deu para salvar isso agora.",
            "That could not be saved right now.",
            "No se pudo guardar eso ahora.",
          )}
        </p>
      )}
      <button
        type="button"
        className="library-series-all"
        onClick={() => {
          const next = new URLSearchParams(params.toString());
          for (const key of ["q", "filter", "sort", "page"]) next.delete(key);
          next.set("shelf", "series");
          window.history.pushState(null, "", `${pathname}?${next}`);
        }}
      >
        {tri(
          lang,
          "Ver todas as séries",
          "View all series",
          "Ver todas las series",
        )}{" "}
        →
      </button>
    </section>
  );
}
