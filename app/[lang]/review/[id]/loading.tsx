export default function Loading() {
  return (
    <main
      className="social-page review-page social-skeleton"
      aria-busy="true"
      aria-label="Loading"
    >
      <span className="skeleton-block skeleton-back" />
      <div className="skeleton-review-card">
        <span className="skeleton-block" />
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </div>
    </main>
  );
}
