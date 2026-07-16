export default function SearchLoading() {
  return (
    <main
      className="catalog-search-page catalog-search-loading"
      aria-busy="true"
    >
      <span className="sr-only">Carregando catálogo</span>
      <header className="catalog-search-hero catalog-search-hero-loading">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <div className="catalog-search-form-loading skeleton-block" />
        <div className="catalog-search-signals-loading">
          <i className="skeleton-block" />
          <i className="skeleton-block" />
          <i className="skeleton-block" />
        </div>
      </header>
      <div className="catalog-search-workspace">
        <details
          className="catalog-filter-shell catalog-filter-shell-loading"
          open
        >
          <summary>
            <span className="skeleton-block" />
          </summary>
          <aside className="catalog-filter-loading">
            <div className="catalog-filter-heading-loading">
              <span className="skeleton-block" />
              <i className="skeleton-block" />
            </div>
            <div className="catalog-filter-body catalog-filter-body-loading">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="catalog-filter-group-loading" key={index}>
                  <span className="skeleton-block" />
                  <div>
                    <i className="skeleton-block" />
                    <i className="skeleton-block" />
                    <i className="skeleton-block" />
                  </div>
                </div>
              ))}
            </div>
            <div className="catalog-filter-actions catalog-filter-actions-loading">
              <span className="skeleton-block" />
              <i className="skeleton-block" />
            </div>
          </aside>
        </details>
        <section className="catalog-results-loading">
          <header>
            <div>
              <span className="skeleton-block" />
              <i className="skeleton-block" />
              <i className="skeleton-block" />
            </div>
            <span className="skeleton-block" />
          </header>
          <div className="catalog-results-loading-grid">
            {Array.from({ length: 18 }, (_, index) => (
              <article className="catalog-result-loading" key={index}>
                <i className="skeleton-block" />
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </article>
            ))}
          </div>
        </section>
        <aside className="catalog-context-rail catalog-context-loading">
          <section>
            <span className="skeleton-block" />
            <i className="skeleton-block" />
            <i className="skeleton-block" />
          </section>
          <section>
            <span className="skeleton-block" />
            {Array.from({ length: 4 }, (_, index) => (
              <i className="skeleton-block" key={index} />
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
