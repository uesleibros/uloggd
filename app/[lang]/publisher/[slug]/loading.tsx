import "../publisher.css";
import {
  PublisherCardSkeleton,
  PublisherSectionSkeleton,
} from "@/components/publisher-skeleton";

export default function Loading() {
  return (
    <main className="publisher-page publisher-route-skeleton" aria-busy="true">
      <div className="publisher-banner skeleton-block" />
      <header className="publisher-header">
        <span className="publisher-logo-anchor publisher-route-skeleton-logo skeleton-block" />
        <div className="publisher-identity">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </header>
      <div className="publisher-body">
        <div className="publisher-main">
          <PublisherSectionSkeleton kind="covers" />
          <PublisherSectionSkeleton kind="covers" />
        </div>
        <aside className="publisher-rail">
          <PublisherCardSkeleton />
          <PublisherCardSkeleton />
        </aside>
      </div>
    </main>
  );
}
