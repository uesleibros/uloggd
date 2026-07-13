export function SocialPageSkeleton({ profile = false }: { profile?: boolean }) {
  return (
    <main
      className={`social-page social-skeleton${profile ? " profile-page" : ""}`}
      aria-busy="true"
      aria-label="Loading"
    >
      {profile && <div className="skeleton-block skeleton-banner" />}
      <div className="skeleton-block skeleton-title" />
      <div className="skeleton-block skeleton-subtitle" />
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
    </main>
  );
}
