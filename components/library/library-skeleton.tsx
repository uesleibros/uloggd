/**
 * The collection, waiting: the filter rail and the grid of covers.
 *
 * Its own component because it is drawn in two places that must match. The
 * route's `loading.tsx` shows it under a placeholder hero while the frame is on
 * its way, and the collection shows it again once the frame has arrived and
 * the library is still being read. When those were two different drawings the
 * page swapped one skeleton for another before the covers came in, which reads
 * as the page changing its mind.
 */
export function LibraryCollectionSkeleton() {
  return (
    <div className="library-loading-layout" aria-busy="true" aria-hidden>
      <aside className="skeleton-block" />
      <section>
        {Array.from({ length: 12 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </section>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <main
      className="library-page library-loading"
      aria-busy="true"
      aria-label="Loading library"
    >
      <header className="library-loading-hero skeleton-block">
        <span />
        <div>
          <i />
          <i />
          <i />
        </div>
      </header>
      <div className="library-page-body">
        <div className="library-loading-toolbar">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <LibraryCollectionSkeleton />
      </div>
    </main>
  );
}
