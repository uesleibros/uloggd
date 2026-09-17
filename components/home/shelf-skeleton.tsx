/**
 * The place a shelf holds while it loads.
 *
 * These carry the `home-loading-*` classes the full-page home skeleton used to
 * use, and they outlived it: that skeleton was the fallback for every route
 * under the locale, so opening the catalogue search flashed a feed that was
 * never coming. The shelves kept the shapes and the root fallback became
 * `PageSkeleton`, which promises nothing in particular.
 *
 * The point of reusing them is that a placeholder should be the same shape and
 * the same height as the shelf that replaces it, or the page jumps as each one
 * lands. The heading is real text rather than a grey bar, because the heading
 * is known before the data is and there is no reason to hide it.
 */
export function ShelfSkeleton({
  layout,
  count,
}: {
  /** Which of the home page's placeholder grids to stand in for. */
  layout: "covers" | "reviews" | "rows";
  count: number;
}) {
  return (
    <div
      className={`home-loading-${layout}`}
      aria-busy="true"
      aria-hidden
      data-shelf-skeleton={layout}
    >
      {Array.from({ length: count }).map((_, index) => (
        <span className="skeleton-block" key={index} />
      ))}
    </div>
  );
}
