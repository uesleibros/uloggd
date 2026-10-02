import { ShelfSkeleton } from "./shelf-skeleton";

export function HomePageSkeleton() {
  return (
    <div
      className="home-shell home-community-shell"
      aria-busy="true"
      aria-hidden
      data-page-skeleton="home"
    >
      <div className="feed home-community-main">
        <header className="home-community-intro home-route-skeleton-intro">
          <div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
          <div className="home-community-actions">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
        </header>
        <section className="home-highlights-loading">
          <ShelfSkeleton layout="reviews" count={2} />
        </section>
        <section className="home-playing-section">
          <ShelfSkeleton layout="covers" count={8} />
        </section>
        <section className="home-reviews-section">
          <ShelfSkeleton layout="reviews" count={3} />
        </section>
      </div>
    </div>
  );
}
