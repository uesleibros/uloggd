export default function SearchLoading() {
  return (
    <main className="catalog-search-page catalog-search-loading" aria-hidden>
      <header className="catalog-search-hero skeleton-block" />
      <div className="catalog-search-workspace">
        <aside className="catalog-filter-loading skeleton-block" />
        <section className="catalog-results-loading">
          <span className="skeleton-block" />
          <div>
            {Array.from({ length: 12 }, (_, index) => (
              <i className="skeleton-block" key={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
