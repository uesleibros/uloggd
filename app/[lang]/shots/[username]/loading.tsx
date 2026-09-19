import { WorkspaceHeroSkeleton } from "@/components/social/workspace-hero-skeleton";
import { ShotsBodySkeleton } from "@/components/social/workspace-body-skeletons";

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
      <div className="workspace-page-body reviews-workspace">
        <ShotsBodySkeleton />
      </div>
    </main>
  );
}
