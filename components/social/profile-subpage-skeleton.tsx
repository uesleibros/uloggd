export function ProfileSubpageSkeleton({
  variant = "stream",
}: {
  /**
   * `numbers` is the shape of the stats page: a card, a row of figures and
   * two panels. The grid of covers stood in for it, which meant the page
   * jumped from six cards to a hero and a chart the moment it arrived.
   */
  variant?: "stream" | "grid" | "numbers";
}) {
  return (
    <main
      className="social-page profile-subpage social-skeleton"
      aria-busy="true"
      aria-label="Loading"
    >
      <span className="skeleton-block skeleton-back" />
      <div className="skeleton-block skeleton-title" />
      {variant === "numbers" ? (
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
        <div className="skeleton-stream">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="skeleton-entry" key={index}>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
