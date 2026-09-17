/**
 * The place a shelf holds while it loads.
 *
 * These reuse the classes the full-page `HomeSkeleton` already had, which is
 * the point: the placeholder for one shelf should be the same shape and the
 * same height as the shelf that replaces it, or the page jumps as each one
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
