const covers = Array.from({ length: 5 });
const reviewCards = Array.from({ length: 4 });
const rows = Array.from({ length: 3 });
const discoveryLanes = Array.from({ length: 3 });
/** Mirrors the shelves Home ends on, so the page stops growing under the fold. */
const catalogShelves = Array.from({ length: 2 });

export function HomeSkeleton() {
  return (
    /* Hidden from assistive technology rather than named.
    
       It used to carry `aria-label="Loading"`, which a plain div may not have,
       so the name was discarded by every screen reader that met it — and it
       was hardcoded English on a site that speaks three languages. There is
       nothing here worth describing: the real page announces itself when it
       arrives. Same shape the tierlist placeholder already used. */
    <div
      className="home-shell home-community-shell home-loading"
      aria-busy="true"
      aria-hidden
    >
      {/* A div, not a `main`. Next keeps this tree mounted for a moment while
          the real page streams in beside it, and two `main` landmarks on one
          document is both wrong and, for anything waiting on `main`, a
          placeholder mistaken for the page. */}
      <div className="feed home-community-main">
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
          <div className="home-loading-covers">
            {covers.map((_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
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
        {catalogShelves.map((_, shelfIndex) => (
          <section className="home-loading-section" key={shelfIndex}>
            <span className="skeleton-block" />
            <div className="home-loading-covers">
              {covers.map((__, coverIndex) => (
                <span className="skeleton-block" key={coverIndex} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <aside className="right-rail home-loading-rail">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </aside>
    </div>
  );
}
