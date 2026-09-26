import Image from "next/image";
import Link from "next/link";
import { Check, Gamepad2, Library } from "lucide-react";
import { getSeriesGames, type GameDetail } from "@/lib/igdb";
import { getLibraryCards } from "@/lib/library-state";
import { resolveGameCover } from "@/lib/game-cover";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * How far through a series somebody is.
 *
 * The count is the point, and the count is only honest if the series is the
 * games rather than every edition and port of them: `getSeriesGames` is where
 * that normalisation lives and why. Anything missing from IGDB's own series
 * is missing here too, which is the right failure, because inventing the
 * membership of a series is worse than not drawing one.
 *
 * Signed out, it is still worth showing: the series is a fact about the game.
 * Only the marks on the covers need an account.
 */
export async function SeriesProgress({
  game,
  lang,
  signedIn,
}: {
  game: GameDetail;
  lang: UiLang;
  signedIn: boolean;
}) {
  if (!game.series) return null;
  const games = await getSeriesGames(game.series);
  // A series of one is the game you are already looking at.
  if (games.length < 2) return null;

  const saved = signedIn
    ? await getLibraryCards(games.map((one) => one.id))
    : null;
  const state = new Map((saved?.data ?? []).map((row) => [row.igdb_id, row]));
  const played = games.filter((one) => {
    const row = state.get(one.id);
    return Boolean(
      row && (row.playing || row.status === "COMPLETED" || row.quick_rating),
    );
  }).length;
  const finished = games.filter(
    (one) => state.get(one.id)?.status === "COMPLETED",
  ).length;

  return (
    <section className="series-progress">
      <header>
        <div>
          <span>{tri(lang, "SÉRIE", "SERIES", "SERIE")}</span>
          <h2>{game.series.name}</h2>
        </div>
        {signedIn && (
          <p>
            {tri(
              lang,
              `${finished} de ${games.length} terminados`,
              `${finished} of ${games.length} finished`,
              `${finished} de ${games.length} terminados`,
            )}
          </p>
        )}
      </header>
      {signedIn && (
        <div
          className="series-progress-track"
          role="img"
          aria-label={tri(
            lang,
            `${played} de ${games.length} na sua biblioteca`,
            `${played} of ${games.length} in your library`,
            `${played} de ${games.length} en tu biblioteca`,
          )}
        >
          <i
            style={{ width: `${Math.round((played / games.length) * 100)}%` }}
          />
        </div>
      )}
      <ol className="series-progress-list">
        {games.map((one) => {
          const row = state.get(one.id);
          const done = row?.status === "COMPLETED";
          return (
            <li key={one.id} data-current={one.id === game.id ? "" : undefined}>
              <Link href={`/${lang}/game/${one.slug}`}>
                <span className="series-progress-cover">
                  <Image
                    src={resolveGameCover(one.coverUrl, row?.custom_cover_url)}
                    alt=""
                    fill
                    sizes="88px"
                  />
                  {done && (
                    <b className="series-progress-mark" data-done>
                      <Check size={12} strokeWidth={3} />
                    </b>
                  )}
                  {!done && row?.playing && (
                    <b className="series-progress-mark" data-playing>
                      <Gamepad2 size={12} />
                    </b>
                  )}
                  {!done && !row?.playing && row && (
                    <b className="series-progress-mark">
                      <Library size={12} />
                    </b>
                  )}
                </span>
                <strong>{one.name}</strong>
                <small>{one.releaseYear ?? "TBA"}</small>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
