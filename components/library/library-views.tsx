"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function LibraryViews({
  here,
  lang,
}: {
  here: "games" | "copies" | "series";
  lang: UiLang;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const names = {
    games: uiText(lang).games,
    copies: tri(lang, "Cópias", "Copies", "Copias"),
    series: tri(lang, "Séries", "Series", "Series"),
  };
  return (
    <nav
      className="library-views app-tabs"
      aria-label={tri(lang, "Biblioteca", "Library", "Biblioteca")}
    >
      {(["games", "copies", "series"] as const).map((view) => (
        <button
          key={view}
          type="button"
          data-active={view === here || undefined}
          aria-current={view === here ? "page" : undefined}
          onClick={() => {
            if (view === here) return;
            const next = new URLSearchParams(params.toString());
            for (const key of ["q", "sort", "filter", "page", "cursor"])
              next.delete(key);
            if (view === "games") next.delete("shelf");
            else next.set("shelf", view);
            window.history.pushState(
              null,
              "",
              `${pathname}${next.size ? `?${next}` : ""}`,
            );
          }}
        >
          {names[view]}
        </button>
      ))}
    </nav>
  );
}
