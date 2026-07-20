export default function Loading() {
  return (
    <main className="onboarding-shell" aria-busy="true">
      <div className="form-loading-card">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
    </main>
  );
}
