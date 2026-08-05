import { WorkspaceHeroSkeleton } from "@/components/social/workspace-hero-skeleton";

/**
 * The screenshot workspace, waiting.
 *
 * Without this file the router had nothing to show while the page resolved, so
 * navigating here left the previous page on screen with no sign anything was
 * happening. The shapes mirror `page.tsx`: the same hero, the same scope tabs,
 * then the gallery grid.
 */
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
        <div className="reviews-loading-heading">
          <div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <span className="skeleton-block" />
        </div>
        {/* The gallery is the page: a grid of covers, not a stream of text. */}
        <div className="screenshot-gallery-grid">
          {Array.from({ length: 9 }, (_, index) => (
            <span className="skeleton-block shots-loading-card" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
