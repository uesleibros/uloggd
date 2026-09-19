/**
 * The catalogue's results, waiting: a grid of card-shaped placeholders at the
 * same column width and spacing as the grid that replaces them.
 *
 * Drawn by the route's `loading.tsx` while the frame is on its way, and by the
 * search itself while its first results are being fetched by the browser. It
 * is one component so the two cannot drift into different shapes, which is
 * what makes a page swap one skeleton for another before anything real lands.
 */
export function CatalogResultsGridSkeleton() {
  return (
    <div className="catalog-results-loading-grid" aria-busy="true" aria-hidden>
      {Array.from({ length: 18 }, (_, index) => (
        <article className="catalog-result-loading" key={index}>
          <i className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </article>
      ))}
    </div>
  );
}
