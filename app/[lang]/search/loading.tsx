"use client";

import { useSearchParams } from "next/navigation";
import "./catalog.css";
import { CatalogResultsGridSkeleton } from "@/components/catalog-results-skeleton";
import { EntityResultsSkeleton } from "@/components/entity-results-skeleton";
import { ArchiveStreamSkeleton } from "@/components/social/workspace-body-skeletons";

export default function SearchLoading() {
  const params = useSearchParams();
  const scope = params.get("scope") ?? "games";
  const entity = [
    "reviews",
    "lists",
    "tierlists",
    "people",
    "companies",
  ].includes(scope);
  return (
    <main
      className={`catalog-search-page catalog-search-loading${entity ? " entity-search-page" : ""}`}
      aria-busy="true"
      aria-hidden="true"
      data-page-skeleton="search"
    >
      <header className="catalog-search-hero catalog-search-hero-loading">
        <div className="catalog-search-hero-copy">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <div className="catalog-search-form-loading skeleton-block" />
      </header>
      <div className="catalog-search-scope-loading">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="skeleton-block" key={index} />
        ))}
      </div>
      <div
        className={`catalog-search-workspace${entity ? " entity-search-workspace" : ""}`}
      >
        <section className="catalog-results-loading">
          <header>
            <div>
              <span className="skeleton-block" />
              <i className="skeleton-block" />
              <i className="skeleton-block" />
            </div>
            <div className="catalog-results-tools">
              <span className="skeleton-block catalog-filter-trigger-loading" />
              <span className="skeleton-block catalog-sort-loading" />
            </div>
          </header>
          {scope === "reviews" ? (
            <ArchiveStreamSkeleton />
          ) : entity ? (
            <EntityResultsSkeleton scope={scope} count={24} />
          ) : (
            <CatalogResultsGridSkeleton />
          )}
        </section>
        <aside className="catalog-context-rail catalog-context-loading">
          <section>
            <span className="skeleton-block" />
            <i className="skeleton-block" />
            <i className="skeleton-block" />
          </section>
          <section>
            <span className="skeleton-block" />
            {Array.from({ length: 4 }, (_, index) => (
              <i className="skeleton-block" key={index} />
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
