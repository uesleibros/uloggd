export function ProfileSubpageSkeleton({
  variant = "stream",
}: {
  variant?: "stream" | "grid";
}) {
  return (
    <main
      className="social-page profile-subpage social-skeleton"
      aria-busy="true"
      aria-label="Loading"
    >
      <span className="skeleton-block skeleton-back" />
      <div className="skeleton-block skeleton-title" />
      {variant === "grid" ? (
        <div className="skeleton-card-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="lists-loading-card" key={index}>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="skeleton-stream">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="skeleton-entry" key={index}>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
