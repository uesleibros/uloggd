export function SettingsSkeleton() {
  return (
    <div
      className="settings-skeleton social-skeleton"
      aria-busy="true"
      // Same reason as the home placeholder: a div may not carry a name, so
      // this one was being thrown away unread, in the wrong language.
      aria-hidden
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
