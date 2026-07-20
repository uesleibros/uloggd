import { WorkspaceHeroSkeleton } from "@/components/social/workspace-hero-skeleton";

export default function Loading() {
  return (
    <main
      className="social-page lists-page lists-loading workspace-layout-page"
      aria-busy="true"
    >
      <WorkspaceHeroSkeleton />
      <div className="workspace-page-body">
        <div className="lists-loading-heading">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <div className="lists-row">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="lists-loading-card" key={index}>
              <span className="skeleton-block" />
              <div>
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
