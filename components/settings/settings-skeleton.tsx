export function SettingsSkeleton() {
  return (
    <div
      className="settings-skeleton social-skeleton"
      aria-busy="true"
      aria-label="Loading"
    >
      <nav aria-hidden>
        {Array.from({ length: 7 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </nav>
      <section>
        <span className="skeleton-block" />
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </section>
      <div className="settings-skeleton-cards">
        {Array.from({ length: 3 }, (_, index) => (
          <article key={index}>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </article>
        ))}
      </div>
    </div>
  );
}
