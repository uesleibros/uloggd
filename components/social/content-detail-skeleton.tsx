export function ContentDetailSkeleton({
  kind = "review",
}: {
  kind?: "review" | "entry" | "screenshot";
}) {
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
