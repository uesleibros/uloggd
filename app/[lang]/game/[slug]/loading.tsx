export default function Loading() {
  return (
    <main className="game-page game-route-skeleton" aria-busy="true">
      <section className="game-stage game-route-skeleton-stage">
        <div className="game-route-skeleton-hero skeleton-block" />
        <div className="game-stage-inner">
          <div className="game-route-skeleton-cover skeleton-block" />
          <div className="game-page-content game-route-skeleton-copy">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
        </div>
      </section>
    </main>
  );
}
