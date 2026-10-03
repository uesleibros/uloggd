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
            <>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function AwardsPageSkeleton({ detail = false }: { detail?: boolean }) {
  return (
    <main className="awards-page" aria-busy="true" aria-hidden>
      {detail && (
        <span className="skeleton-block awards-back awards-back-loading" />
      )}
      <header className="awards-hero awards-hero-loading">
        <div className="awards-hero-loading-text">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <span className="skeleton-block awards-loading-action" />
      </header>
      {detail && (
        <section className="awards-rules awards-rules-loading">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </section>
      )}
      <div className={detail ? undefined : "awards-body"}>
        {!detail && (
          <div className="awards-tabs awards-tabs-loading">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
        )}
        <AwardCardsSkeleton detail={detail} />
      </div>
    </main>
  );
}
