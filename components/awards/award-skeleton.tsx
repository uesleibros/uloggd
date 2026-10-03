export function AwardCardsSkeleton({ detail = false }: { detail?: boolean }) {
  return (
    <div
      className={detail ? "awards-categories" : "awards-grid"}
      aria-hidden
      data-awards-skeleton
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          className={
            detail
              ? "awards-category awards-category-loading"
              : "awards-preview awards-preview-loading"
          }
          key={i}
        >
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          {detail ? (
            <div className="awards-nominees">
              {Array.from({ length: 5 }, (_, j) => (
                <span className="skeleton-block awards-nominee-cover" key={j} />
              ))}
            </div>
          ) : (
            <span className="skeleton-block" />
          )}
        </div>
      ))}
    </div>
  );
}

export function AwardsPageSkeleton({ detail = false }: { detail?: boolean }) {
  return (
    <main className="awards-page" aria-busy="true" aria-hidden>
      <header className="awards-hero awards-hero-loading">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </header>
      <div className="awards-body">
        <AwardCardsSkeleton detail={detail} />
      </div>
    </main>
  );
}
