import { LibrarySeriesRowSkeleton } from "./library-series-row-skeleton";
import { Layers } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The collection, waiting: the filter rail and the grid of covers.
 *
 * Its own component because it is drawn in two places that must match. The
 * route's `loading.tsx` shows it under a placeholder hero while the frame is on
 * its way, and the collection shows it again once the frame has arrived and
 * the library is still being read. When those were two different drawings the
 * page swapped one skeleton for another before the covers came in, which reads
 * as the page changing its mind.
 */
export function LibraryCollectionSkeleton({
  view = "grid",
  copies = false,
}: {
  view?: "grid" | "list";
  copies?: boolean;
}) {
  return (
    <div
      className="library-workspace library-loading-layout"
      aria-busy="true"
      aria-hidden
      data-shelf-skeleton="library"
    >
      <div className="library-views app-tabs skeleton-tab-row">
        {Array.from({ length: 3 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
      {!copies && (
        <div className="library-smart-shelves game-page-nav app-tabs skeleton-tab-row">
          {Array.from({ length: 8 }, (_, index) => (
            <span className="skeleton-block" key={index} />
          ))}
        </div>
      )}
      <div className="library-toolbar library-loading-controls">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
      <div className="library-results-meta">
        <span className="skeleton-block" />
      </div>
      <section className="library-results" data-view={view}>
        {Array.from({ length: 12 }, (_, index) => (
          <div className="library-loading-card" key={index}>
            <i className="skeleton-block" />
            <div>
              <b className="skeleton-block" />
              <em className="skeleton-block" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function LibrarySkeleton({
  series = false,
  copies = false,
  view = "grid",
}: {
  series?: boolean;
  copies?: boolean;
  view?: "grid" | "list";
}) {
  return (
    <main
      className="library-page library-loading"
      aria-busy="true"
      aria-hidden="true"
      data-page-skeleton="library"
    >
      <header className="library-hero">
        <div className="library-hero-content library-loading-hero">
          <span />
          <div>
            <i />
            <i />
            <i />
          </div>
          {!series && <LibraryStatsSkeleton />}
        </div>
      </header>
      <div className="library-page-body">
        <div className="library-context-bar library-loading-context">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        {series ? (
          <div className="library-workspace">
            <div className="library-views app-tabs skeleton-tab-row">
              {Array.from({ length: 3 }, (_, index) => (
                <span className="skeleton-block" key={index} />
              ))}
            </div>
            <section className="series-workspace">
              <header className="skeleton-series-header">
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </header>
              <div className="series-filters app-tabs skeleton-tab-row">
                {Array.from({ length: 3 }, (_, index) => (
                  <span className="skeleton-block" key={index} />
                ))}
              </div>
              <div className="series-workspace-controls library-loading-controls">
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
              <ol className="library-series-list">
                {Array.from({ length: 6 }, (_, index) => (
                  <LibrarySeriesRowSkeleton key={index} />
                ))}
              </ol>
            </section>
          </div>
        ) : (
          <LibraryCollectionSkeleton view={view} copies={copies} />
        )}
      </div>
    </main>
  );
}

export function LibraryStatsSkeleton() {
  return (
    <dl
      className="workspace-hero-stats library-hero-stats library-stats-skeleton"
      aria-hidden
      aria-busy="true"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index}>
          <dt>
            <span className="skeleton-block" />
          </dt>
          <dd>
            <span className="skeleton-block" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LibrarySeriesSkeleton({ lang }: { lang: UiLang }) {
  return (
    <section
      className="library-series library-series-skeleton"
      aria-busy="true"
    >
      <header>
        <h2>
          <Layers size={14} aria-hidden />{" "}
          {tri(lang, "Séries", "Series", "Series")}
        </h2>
        <p>
          {tri(
            lang,
            "Carregando as séries da sua biblioteca...",
            "Loading your library's series...",
            "Cargando las series de tu biblioteca...",
          )}
        </p>
      </header>
      <ol className="library-series-list" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <LibrarySeriesRowSkeleton key={index} />
        ))}
      </ol>
    </section>
  );
}
