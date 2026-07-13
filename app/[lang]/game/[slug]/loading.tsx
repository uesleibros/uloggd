const details = Array.from({ length: 6 });

export default function Loading() {
  return (
    <main className="game-page game-route-skeleton" aria-hidden="true">
      <div className="game-route-skeleton-hero skeleton-block" />
      <div className="game-layout">
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
        <aside className="game-context-rail game-route-skeleton-rail">
          {details.map((_, index) => (
            <span className="skeleton-block" key={index} />
          ))}
        </aside>
      </div>
    </main>
  );
}
