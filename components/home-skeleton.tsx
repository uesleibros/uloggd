const covers = Array.from({ length: 5 });
const rows = Array.from({ length: 4 });

export function HomeSkeleton() {
  return (
    <div
      className="home-shell home-loading"
      aria-busy="true"
      aria-label="Loading"
    >
      <main className="feed">
        <section className="home-loading-feature skeleton-block">
          <div>
            <span />
            <span />
            <span />
          </div>
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
          <div className="home-loading-rows">
            {rows.map((_, index) => (
              <span className="skeleton-block" key={index} />
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
