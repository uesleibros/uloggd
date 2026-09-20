/**
 * A collection's covers, waiting.
 *
 * Drawn in two places that must agree: the route's `loading.tsx`, while the
 * page is on its way, and under the header afterwards, while IGDB is asked for
 * the covers. Its own component so the two cannot drift into showing a
 * different placeholder one after the other.
 *
 * `count` comes from the list itself, which already knows how many games it
 * holds, and each cell is shaped like a real card: cover, title, meta. A grid
 * of ten squares left the comments and the footer to jump down once the covers
 * arrived, which was most of the layout shift on a long list.
 */
export function CollectionGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      className="library-grid list-items-loading"
      aria-busy="true"
      aria-hidden="true"
    >
      {Array.from({ length: Math.min(Math.max(count, 1), 60) }, (_, index) => (
        <span key={index}>
          <i className="skeleton-block" />
          <b className="skeleton-block" />
          <em className="skeleton-block" />
        </span>
      ))}
    </div>
  );
}
