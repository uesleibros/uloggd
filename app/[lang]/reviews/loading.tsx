import { WorkspaceHeroSkeleton } from "@/components/social/workspace-hero-skeleton";

export default function Loading() {
  return (
    <main
      className="social-page social-skeleton workspace-layout-page reviews-page"
      aria-busy="true"
    >
      <WorkspaceHeroSkeleton />
      <div className="workspace-page-body reviews-workspace reviews-loading">
        <div className="reviews-loading-tabs">
          {Array.from({ length: 3 }, (_, index) => (
            <span className="skeleton-block" key={index} />
          ))}
        </div>
        <div className="reviews-loading-workbench">
          <span className="skeleton-block" />
          <div>
            {Array.from({ length: 5 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        </div>
        <div className="reviews-loading-heading">
          <div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <span className="skeleton-block" />
        </div>
        <div className="reviews-loading-stream">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="reviews-loading-entry" key={index}>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
