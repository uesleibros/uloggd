export default function Loading() {
  return (
    <div className="home-shell" aria-busy="true">
      <main className="feed">
        <section className="home-loading-featured">
          <span className="skeleton-block" />
        </section>
        {Array.from({ length: 3 }, (_, section) => (
          <section className="home-loading-rail" key={section}>
            <div className="home-loading-heading">
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
            <div className="home-loading-covers">
              {Array.from({ length: 7 }, (_, index) => (
                <span className="skeleton-block" key={index} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
