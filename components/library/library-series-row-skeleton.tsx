/** Matches a complete series strip, reserving space for its progress and covers. */
export function LibrarySeriesRowSkeleton({ name }: { name?: string }) {
  return (
    <li
      className="library-series-skeleton-row"
      aria-hidden={!name || undefined}
      aria-busy="true"
    >
      {name ? <strong>{name}</strong> : <span className="skeleton-block" />}
      <span className="skeleton-block" />
      <div>
        {Array.from({ length: 8 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
      <span className="skeleton-block series-next-skeleton" />
    </li>
  );
}
