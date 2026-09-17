const rows = Array.from({ length: 4 });

/**
 * The wait state every route falls back to.
 *
 * `app/[lang]/loading.tsx` is the nearest boundary for anything under the
 * locale that has not declared its own, which is what makes it worth existing:
 * deleting it takes the wait state away from every route at once. What it must
 * not be is a particular page's shape. It used to draw the home page's feed,
 * complete with its discovery lanes, so opening the catalogue search or a
 * profile flashed a feed that was never coming, and the layout jumped when the
 * real page landed.
 *
 * So this says only what is true of every route: a title is coming, and some
 * content under it. Anything that deserves a better promise than that declares
 * its own skeleton, and the ones whose shape differs most already do.
 */
export function PageSkeleton() {
  return (
    /* Hidden rather than named. There is nothing here worth describing: the
       real page announces itself when it arrives. A div rather than a `main`,
       because Next keeps this mounted while the real page streams in beside it
       and two `main` landmarks on one document is both wrong and, for anything
       waiting on `main`, a placeholder mistaken for the page. */
    <div className="page-loading" aria-busy="true" aria-hidden>
      <div className="page-loading-head">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
      <div className="page-loading-body">
        {rows.map((_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
    </div>
  );
}
