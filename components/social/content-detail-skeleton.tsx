export function ContentDetailSkeleton({
  kind = "review",
}: {
  kind?: "review" | "entry" | "screenshot";
}) {
  if (kind === "review")
    return (
      <main
        className="social-page social-skeleton review-page content-detail-skeleton content-detail-skeleton-review"
        aria-busy="true"
        aria-label="Loading review"
      >
        <span className="skeleton-block skeleton-back" />
        <article className="review-page-card skeleton-review-detail">
          <header>
            <span className="skeleton-block" />
            <div>
              <span className="skeleton-block" />
              <div className="skeleton-review-byline">
                <span className="skeleton-block" />
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
              <div className="skeleton-review-verdict">
                <span className="skeleton-block" />
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </div>
          </header>
          <div className="skeleton-review-copy">
            {Array.from({ length: 5 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
          <div className="skeleton-review-aspects">
            <span className="skeleton-block" />
            <div>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          </div>
          <footer>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </footer>
        </article>
        <section className="skeleton-review-comments">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </section>
      </main>
    );

  return (
    <main
      className={`social-page social-skeleton content-detail-skeleton content-detail-skeleton-${kind}`}
      aria-busy="true"
      aria-label="Loading"
    >
      <span className="skeleton-block skeleton-back" />
      <div className="skeleton-review-card">
        <span className="skeleton-block" />
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </div>
    </main>
  );
}
