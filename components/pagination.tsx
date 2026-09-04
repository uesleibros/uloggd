"use client";

import { tri, type UiLang } from "@/lib/ui-text";

/**
 * First, last, and the current page's neighbours; everything else collapses
 * into a gap so a hundred pages still fit on one line.
 */
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

/**
 * The catalogue's pager, lifted out so every paginated surface reads and
 * behaves the same: page counter, first/last, numbered pages, and a jump box.
 */
export function Pagination({
  page,
  totalPages,
  pending = false,
  lang,
  onGo,
  className,
}: {
  page: number;
  totalPages: number;
  pending?: boolean;
  lang: UiLang;
  onGo: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const items = paginationItems(page, totalPages);
  // The jump box is for the pages the numbered list had to hide. When every
  // page is on screen it is a second way to do what the buttons beside it
  // already do, and reads as two pagers stacked.
  const collapsed = items.some((item) => typeof item === "string");
  return (
    <nav
      className={className ? `pagination ${className}` : "pagination"}
      aria-label={tri(lang, "Paginação", "Pagination", "Paginación")}
    >
      <div className="pagination-summary">
        <strong>
          {tri(lang, `Página ${page}`, `Page ${page}`, `Página ${page}`)}
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
      <div className="pagination-pages">
        <button
          type="button"
          disabled={page === 1 || pending}
          onClick={() => onGo(1)}
        >
          {tri(lang, "Primeira", "First", "Primera")}
        </button>
        {items.map((item) =>
          typeof item === "number" ? (
            <button
              type="button"
              key={item}
              aria-current={item === page ? "page" : undefined}
              disabled={pending}
              onClick={() => onGo(item)}
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
          disabled={page === totalPages || pending}
          onClick={() => onGo(totalPages)}
        >
          {tri(lang, "Última", "Last", "Última")}
        </button>
      </div>
      {collapsed && (
        <form
          className="pagination-jump"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("page");
            onGo(Math.max(1, Math.min(totalPages, Number(value) || 1)));
          }}
        >
          <label htmlFor={`pagination-jump-${className ?? "default"}`}>
            {tri(lang, "Ir para", "Go to", "Ir a")}
          </label>
          <input
            id={`pagination-jump-${className ?? "default"}`}
            type="number"
            name="page"
            min="1"
            max={totalPages}
            defaultValue={page}
            // Remounts on a page change so the box shows where you actually are
            // instead of whatever was last typed into it.
            key={page}
          />
          <button type="submit" disabled={pending}>
            {tri(lang, "Ir", "Go", "Ir")}
          </button>
        </form>
      )}
    </nav>
  );
}
