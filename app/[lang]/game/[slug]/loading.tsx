const details = Array.from({ length: 6 });

export default function Loading() {
  return (
    <main className="game-page game-route-skeleton" aria-hidden="true">
      <section className="game-stage game-route-skeleton-stage">
        <div className="game-route-skeleton-hero skeleton-block" />
        <div className="game-stage-inner">
          <div className="game-route-skeleton-cover skeleton-block" />
          <div className="game-page-content game-route-skeleton-copy">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <div className="game-route-skeleton-actions">
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <aside className="game-stage-rail game-route-skeleton-rail">
            {details.slice(0, 2).map((_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </aside>
        </div>
      </section>
      <div className="game-route-skeleton-nav skeleton-block" />
      <div className="game-body-layout">
        <div className="game-route-skeleton-panel skeleton-block" />
        <div className="game-route-skeleton-panel skeleton-block" />
      </div>
    </main>
  );
}
