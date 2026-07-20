export default function Loading() {
  return (
    <main className="suspension-screen" aria-busy="true">
      <div className="form-loading-card">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
    </main>
  );
}
