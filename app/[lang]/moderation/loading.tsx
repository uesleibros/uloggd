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
        <span className="skeleton-block" />
        <div className="moderation-loading-command">
          {Array.from({ length: 3 }, (_, index) => (
            <span className="skeleton-block" key={index} />
          ))}
        </div>
      </header>
      <div className="moderation-workspace">
        <section className="moderation-section moderation-queue">
          <header>
            <div className="moderation-loading-heading">
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
            <div className="moderation-loading-tabs">
              {Array.from({ length: 5 }, (_, index) => (
                <span className="skeleton-block" key={index} />
              ))}
            </div>
          </header>
          <div className="moderation-loading-rows">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        </section>
        <aside className="moderation-operations">
          {Array.from({ length: 2 }, (_, section) => (
            <section className="moderation-section" key={section}>
              <header>
                <div className="moderation-loading-heading">
                  <span className="skeleton-block" />
                  <span className="skeleton-block" />
                </div>
              </header>
              <div className="moderation-loading-rail-rows">
                {Array.from({ length: 3 }, (_, index) => (
                  <span className="skeleton-block" key={index} />
                ))}
              </div>
            </section>
          ))}
        </aside>
      </div>
    </main>
  );
}
