import { WorkspaceHeroSkeleton } from "@/components/social/workspace-hero-skeleton";

const cards = Array.from({ length: 8 });
const covers = Array.from({ length: 5 });

export default function Loading() {
  return (
    <main
      className="social-page lists-page lists-loading workspace-layout-page"
      aria-busy="true"
    >
      <WorkspaceHeroSkeleton />
      <div className="workspace-page-body">
        <section className="lists-loading-workspace" aria-hidden="true">
          <header className="lists-loading-toolbar">
            <div className="lists-loading-heading">
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
            <div className="lists-loading-tabs">
              {Array.from({ length: 3 }, (_, index) => (
                <span className="skeleton-block" key={index} />
              ))}
            </div>
            <div className="lists-loading-controls">
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          </header>
          <div className="lists-row">
            {cards.map((_, index) => (
              <article className="lists-loading-card" key={index}>
                <div className="lists-loading-stack">
                  {covers.map((__, coverIndex) => (
                    <span className="skeleton-block" key={coverIndex} />
                  ))}
                </div>
                <div className="lists-loading-copy">
                  <span className="skeleton-block" />
                  <span className="skeleton-block" />
                  <span className="skeleton-block" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
