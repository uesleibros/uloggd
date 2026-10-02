export function SocialPageSkeleton({ profile = false }: { profile?: boolean }) {
  return (
    <main
      className={`social-page social-skeleton${profile ? " profile-page" : ""}`}
      aria-busy="true"
      aria-label="Loading"
    >
      {profile ? (
        <>
          <div className="skeleton-block skeleton-banner" />
          <div className="skeleton-profile-header">
            <span className="skeleton-block skeleton-profile-avatar" />
            <div>
              <span className="skeleton-block skeleton-title" />
              <span className="skeleton-block skeleton-subtitle" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="skeleton-block skeleton-title" />
          <div className="skeleton-block skeleton-subtitle" />
        </>
      )}
      {profile && (
        <>
          <div className="profile-loading-actions skeleton-tab-row">
            {Array.from({ length: 5 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
          <div className="profile-loading-tabs skeleton-tab-row">
            {Array.from({ length: 8 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
          <section className="profile-shelf">
            <ShelfSkeleton layout="covers" count={8} />
          </section>
        </>
      )}
      <ArchiveStreamSkeleton />
    </main>
  );
}
import { ShelfSkeleton } from "@/components/home/shelf-skeleton";
import { ArchiveStreamSkeleton } from "./workspace-body-skeletons";
