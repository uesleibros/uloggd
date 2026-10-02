import { tri, type UiLang } from "@/lib/ui-text";

export function SeriesProgressSkeleton({
  name,
  signedIn,
  lang,
}: {
  name: string;
  signedIn: boolean;
  lang: UiLang;
}) {
  return (
    <section className="series-progress series-progress-loading" aria-hidden>
      <header>
        <div>
          <span>{tri(lang, "SÉRIE", "SERIES", "SERIE")}</span>
          <h2>{name}</h2>
        </div>
        {signedIn && (
          <p>
            <b className="skeleton-block" />
            <span className="skeleton-block" />
          </p>
        )}
      </header>
      {signedIn && <div className="series-progress-track skeleton-block" />}
      <div className="series-progress-list">
        <ol>
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <div className="series-progress-loading-slot">
                <span className="series-progress-cover skeleton-block" />
                <strong className="skeleton-block" />
                <small className="skeleton-block" />
              </div>
              {signedIn && (
                <span className="series-progress-loading-action skeleton-block" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
