const items = Array.from({ length: 10 });

export default function Loading() {
  return (
    <main
      className="social-page social-skeleton list-detail-loading"
      aria-busy="true"
    >
      <header className="list-detail-loading-header" aria-hidden="true">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </header>
      <div
        className="list-detail-loading-add skeleton-block"
        aria-hidden="true"
      />
      <div
        className="skeleton-cover-grid list-detail-loading-grid"
        aria-hidden="true"
      >
        {items.map((_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
    </main>
  );
}
