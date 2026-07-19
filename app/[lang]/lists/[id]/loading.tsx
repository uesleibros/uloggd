export default function Loading() {
  return (
    <main
      className="social-page social-skeleton"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="skeleton-block skeleton-title" />
      <div className="skeleton-block skeleton-subtitle" />
      <div className="skeleton-cover-grid">
        {Array.from({ length: 12 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
    </main>
  );
}
