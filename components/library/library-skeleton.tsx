export function LibrarySkeleton() {
  return (
    <main
      className="library-page library-loading"
      aria-busy="true"
      aria-label="Loading library"
    >
      <header className="library-loading-hero skeleton-block">
        <span />
        <div>
          <i />
          <i />
          <i />
        </div>
      </header>
      <div className="library-page-body">
        <div className="library-loading-toolbar">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <div className="library-loading-layout">
          <aside className="skeleton-block" />
          <section>
            {Array.from({ length: 12 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
