export default function Loading() {
  return (
    <main className="social-page lists-page lists-loading" aria-busy="true">
      <div className="lists-loading-hero">
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <span className="skeleton-block" />
      </div>
      <div className="lists-loading-heading">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
      <div className="lists-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="lists-loading-card" key={index}>
            <span className="skeleton-block" />
            <div>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
