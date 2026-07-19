export function SettingsSkeleton() {
  return (
    <div
      className="settings-skeleton social-skeleton"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <section key={index}>
          <span className="skeleton-block" />
          <div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
        </section>
      ))}
    </div>
  );
}
