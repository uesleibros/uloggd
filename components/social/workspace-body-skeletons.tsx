/**
 * The bodies of the profile workspaces, waiting.
 *
 * Each is drawn in two places that have to match. The route's `loading.tsx`
 * shows it under a placeholder hero while the frame is on its way, and the
 * workspace shows it again once the frame has arrived and its data is still
 * being read by the browser. When those were two different drawings, opening a
 * page swapped one skeleton for another before anything real appeared, which is
 * the page appearing to change its mind.
 */

/** The reviews and journeys stream. */
export function ArchiveStreamSkeleton() {
  return (
    <div className="reviews-loading-stream" aria-busy="true" aria-hidden>
      {Array.from({ length: 3 }, (_, index) => (
        <div className="reviews-loading-entry" key={index}>
          <span className="skeleton-block" />
          <div>
            <header>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
              <span className="skeleton-block" />
            </header>
            <span className="skeleton-block reviews-loading-verb" />
            <span className="skeleton-block reviews-loading-rating" />
            <div className="reviews-loading-copy">
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
            <footer>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </footer>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The screenshot gallery: its filter tabs, its heading and its grid. */
export function ShotsBodySkeleton() {
  return (
    <div className="reviews-loading" aria-busy="true" aria-hidden>
      <div className="reviews-loading-tabs">
        {Array.from({ length: 3 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
      <div className="reviews-loading-heading">
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <span className="skeleton-block" />
      </div>
      {/* The gallery is the page: a grid of covers, not a stream of text. */}
      <div className="screenshot-gallery-grid">
        {Array.from({ length: 9 }, (_, index) => (
          <span className="skeleton-block shots-loading-card" key={index} />
        ))}
      </div>
    </div>
  );
}
