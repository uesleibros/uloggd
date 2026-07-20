import "./moderation.css";

export default function Loading() {
  return (
    <main className="moderation-page" aria-busy="true">
      <header className="moderation-hero moderation-loading-hero">
        <span className="skeleton-block" />
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </header>
      {Array.from({ length: 2 }, (_, section) => (
        <section className="moderation-section" key={section}>
          <header>
            <div className="moderation-loading-heading">
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          </header>
          <div className="moderation-loading-rows">
            {Array.from({ length: 3 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
