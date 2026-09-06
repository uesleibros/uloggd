import "./moderation.css";

/**
 * The console's shape before its data.
 *
 * It has to match the real markup or the page settles by jumping. The old one
 * drew a hero with a strip of three counters that the console no longer has,
 * so the first paint after loading pulled everything up by the height of a
 * row that was never coming.
 */
export default function Loading() {
  return (
    <main className="moderation-page" aria-busy="true">
      <header className="moderation-hero moderation-loading-hero">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </header>
      <div className="moderation-workspace">
        <section className="moderation-section moderation-queue">
          <div className="moderation-loading-heading">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <div className="moderation-loading-tabs">
            {Array.from({ length: 5 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
          <div className="moderation-loading-rows">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        </section>
        <div className="moderation-rail">
          {Array.from({ length: 2 }, (_, section) => (
            <section className="moderation-section" key={section}>
              <div className="moderation-loading-heading">
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
              <div className="moderation-loading-rail-rows">
                {Array.from({ length: 3 }, (_, index) => (
                  <span className="skeleton-block" key={index} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
