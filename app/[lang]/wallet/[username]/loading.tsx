import { WorkspaceHeroSkeleton } from "@/components/social/workspace-hero-skeleton";

/**
 * The wallet, waiting.
 *
 * Six mineral slots because the wallet always has six, full or empty: holding
 * the real count means the layout does not jump when the page arrives.
 */
export default function Loading() {
  return (
    <main
      className="social-page social-skeleton wallet-page workspace-layout-page"
      aria-busy="true"
    >
      <WorkspaceHeroSkeleton />
      <div className="workspace-page-body reviews-workspace reviews-loading">
        <div className="reviews-loading-heading">
          <div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <span className="skeleton-block" />
        </div>
        <div className="wallet-loading-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <span className="skeleton-block wallet-loading-slot" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
