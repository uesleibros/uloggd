const covers = Array.from({ length: 5 });
const reviewCards = Array.from({ length: 4 });
const rows = Array.from({ length: 3 });
const discoveryLanes = Array.from({ length: 3 });

export function HomeSkeleton() {
  return (
    <div
      className="home-shell home-community-shell home-loading"
      aria-busy="true"
      aria-label="Loading"
    >
      <main className="feed home-community-main">
        <section className="home-loading-feature">
          <div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <span className="skeleton-block" />
        </section>
        <section className="home-loading-section">
          <span className="skeleton-block" />
          <div className="home-loading-reviews">
            {reviewCards.map((_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        </section>
        <section className="home-loading-section">
          <span className="skeleton-block" />
          <div className="home-loading-rows">
            {rows.map((_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        </section>
        <section className="home-loading-section home-loading-discoveries">
          <span className="skeleton-block" />
          <div className="home-loading-discovery-lanes">
            {discoveryLanes.map((_, laneIndex) => (
              <div className="home-loading-discovery-lane" key={laneIndex}>
                <span className="skeleton-block" />
                <div className="home-loading-covers">
                  {covers.map((__, coverIndex) => (
                    <span className="skeleton-block" key={coverIndex} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <aside className="right-rail home-loading-rail">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </aside>
    </div>
  );
}
