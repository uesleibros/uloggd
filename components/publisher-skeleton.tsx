export function PublisherSectionSkeleton({
  kind,
  title,
  description,
}: {
  kind: "covers" | "upcoming" | "trailers" | "events";
  title?: string;
  description?: string;
}) {
  return (
    <section
      className="publisher-section publisher-section-loading"
      aria-hidden
    >
      <header>
        <div>
          {title ? (
            <h2>{title}</h2>
          ) : (
            <span className="publisher-loading-heading skeleton-block" />
          )}
          {description && <p>{description}</p>}
        </div>
      </header>
      {kind === "covers" ? (
        <div className="cover-shelf">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="publisher-loading-game" key={index}>
              <i className="skeleton-block" />
              <b className="skeleton-block" />
              <em className="skeleton-block" />
            </div>
          ))}
        </div>
      ) : kind === "trailers" ? (
        <div className="publisher-trailers">
          {Array.from({ length: 2 }, (_, index) => (
            <article key={index}>
              <div className="skeleton-block" />
              <h3 className="skeleton-block" />
              <small className="skeleton-block" />
            </article>
          ))}
        </div>
      ) : (
        <ol className={`publisher-${kind}`}>
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <div className={`publisher-loading-${kind}`}>
                <i className="skeleton-block" />
                <span>
                  <b className="skeleton-block" />
                  <small className="skeleton-block" />
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function PublisherCardSkeleton() {
  return (
    <section className="publisher-card publisher-card-loading" aria-hidden>
      <h2 className="skeleton-block" />
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index}>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      ))}
    </section>
  );
}
