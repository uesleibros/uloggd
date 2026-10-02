"use client";

import { useParams } from "next/navigation";
import { contentKey } from "@/lib/public-id";
import ListsLoading from "../loading";
import { CollectionGridSkeleton } from "@/components/social/collection-grid-skeleton";

export default function Loading() {
  const { id } = useParams<{ id: string }>();
  if (!contentKey(id)) return <ListsLoading />;
  return (
    <main
      className="social-page social-skeleton list-detail-loading"
      aria-busy="true"
    >
      <header className="list-detail-loading-header" aria-hidden="true">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
        <div>
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </header>
      <div
        className="list-detail-loading-add skeleton-block"
        aria-hidden="true"
      />
      <CollectionGridSkeleton />
    </main>
  );
}
