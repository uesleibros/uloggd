import "../publisher.css";

export default function Loading() {
  return (
    <main className="publisher-page publisher-route-skeleton" aria-busy="true">
      <div className="publisher-banner skeleton-block" />
      <header className="publisher-header">
        <span className="publisher-logo-anchor publisher-route-skeleton-logo skeleton-block" />
        <div className="publisher-identity">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </header>
      <div className="publisher-route-skeleton-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
    </main>
  );
}
