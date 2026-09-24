/**
 * The other scopes' results, waiting, in the shape of the cards that replace
 * them: the same thing the catalogue does while its games load.
 *
 * Every tab but games used to wait as a plain rectangle, one per slot, so the
 * same search changed character between tabs and the page visibly rearranged
 * itself when the real cards landed. A person and a company are a row with a
 * mark and two lines; a list is a strip of covers with a name under it. The
 * placeholder says which, at the same column width and spacing, so nothing
 * moves when the answer arrives.
 */
export function EntityResultsSkeleton({
  scope,
  count,
}: {
  scope: string;
  count: number;
}) {
  const lists = scope === "lists" || scope === "tierlists";
  return (
    <div
      className="entity-search-grid"
      data-scope={scope}
      aria-busy="true"
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <article
          className="entity-result-loading"
          data-shape={lists ? "list" : "row"}
          key={index}
        >
          <i className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          {lists && <span className="skeleton-block" />}
        </article>
      ))}
    </div>
  );
}
