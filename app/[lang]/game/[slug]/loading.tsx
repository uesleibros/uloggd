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
      {/* Below the hero: enough of the page's shape that the footer starts
          where it will stay. A skeleton one screen tall left the footer in
          view, and the page it stood in for pushed it thousands of pixels down
          once it arrived, which was the largest jump on a phone. */}
      <div className="game-route-skeleton-body" aria-hidden="true">
        <span className="skeleton-block game-route-skeleton-tabs" />
        <div className="game-route-skeleton-panels">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </div>
    </main>
  );
}
