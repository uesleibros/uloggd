import "./catalog.css";

export default function SearchLoading() {
  return (
    <main
      className="catalog-search-page catalog-search-loading"
      aria-hidden="true"
    >
      <header className="catalog-search-hero catalog-search-hero-loading">
        <div className="catalog-search-hero-copy">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <div className="catalog-search-form-loading skeleton-block" />
        <div className="catalog-search-signals-loading">
          <i className="skeleton-block" />
          <i className="skeleton-block" />
        </div>
      </header>
      <div className="catalog-search-scope-loading">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
      <div className="catalog-search-workspace">
        <section className="catalog-results-loading">
          <header>
            <div>
              <span className="skeleton-block" />
              <i className="skeleton-block" />
              <i className="skeleton-block" />
            </div>
            <div className="catalog-results-tools">
              <span className="skeleton-block catalog-filter-trigger-loading" />
              <span className="skeleton-block catalog-sort-loading" />
            </div>
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
