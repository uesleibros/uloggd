export function WorkspaceHeroSkeleton() {
  return (
    <div className="workspace-hero workspace-hero-skeleton" aria-hidden="true">
      <div className="workspace-hero-content">
        <span className="skeleton-block" />
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <span className="skeleton-block" />
      </div>
    </div>
  );
}
