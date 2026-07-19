import { WorkspaceHeroSkeleton } from "@/components/social/workspace-hero-skeleton";

export default function Loading() {
  return (
    <main
      className="social-page social-skeleton workspace-layout-page reviews-page"
      aria-busy="true"
    >
      <WorkspaceHeroSkeleton />
      <div className="workspace-page-body">
        <div className="skeleton-stream">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="skeleton-entry" key={index}>
              <span className="skeleton-block" />
              <div>
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
