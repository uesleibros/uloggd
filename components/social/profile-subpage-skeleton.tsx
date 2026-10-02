export function ProfileSubpageSkeleton({
  variant = "stream",
}: {
  /**
   * `numbers` is the shape of the stats page: a card, a row of figures and
   * two panels. The grid of covers stood in for it, which meant the page
   * jumped from six cards to a hero and a chart the moment it arrived.
   */
  variant?: "stream" | "grid" | "numbers" | "connections" | "year";
}) {
  return (
    <main
      className="social-page profile-subpage social-skeleton"
      aria-busy="true"
      aria-label="Loading"
    >
      <span className="skeleton-block skeleton-back" />
      <div className="skeleton-block skeleton-title" />
      {variant === "connections" ? (
        <ConnectionsBodySkeleton />
      ) : variant === "year" ? (
        <div className="year-loading-body">
          <div className="year-toolbar skeleton-tab-row">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <div className="year-hero-card skeleton-block" />
          <div className="year-stat-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <span className="year-stat skeleton-block" key={index} />
            ))}
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <div className="year-panel skeleton-block" key={index} />
          ))}
        </div>
      ) : variant === "numbers" ? (
        <div className="skeleton-numbers">
          <span className="skeleton-block skeleton-numbers-hero" />
          <div className="skeleton-numbers-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
          <span className="skeleton-block skeleton-numbers-panel" />
          <span className="skeleton-block skeleton-numbers-panel" />
        </div>
      ) : variant === "grid" ? (
        <div className="skeleton-card-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="lists-loading-card" key={index}>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ArchiveStreamSkeleton />
      )}
    </main>
  );
}
import {
  ArchiveStreamSkeleton,
  ConnectionsBodySkeleton,
} from "./workspace-body-skeletons";
