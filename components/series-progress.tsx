import Image from "next/image";
import Link from "next/link";
import { Check, Gamepad2, Library, Repeat } from "lucide-react";
import { getSeriesGames, type GameDetail } from "@/lib/igdb";
import { getLibraryCards } from "@/lib/library-state";
import { resolveGameCover } from "@/lib/game-cover";
import { seriesSlots, slotProgress } from "@/lib/series-policy";
import { Tooltip } from "@/components/ui/tooltip";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * How far through a series somebody is.
 *
 * The count is the point, and the count is only honest if the series is the
 * games rather than every edition and port of them, and if a remake counts as
 * the game it remakes. Both of those are `lib/series-policy.ts`, which is
 * where the reasoning lives and where it is tested.
 *
 * Anything missing from IGDB's own series is missing here too, which is the
 * right failure: inventing the membership of a series is worse than not
 * drawing one.
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
  // A reader with no library has nothing for an edition to satisfy, so the
  // second catalogue query is not asked for. Most game page traffic is
  // crawlers, and this is half of what the series costs them.
  const games = await getSeriesGames(game.series, signedIn);
  const slots = seriesSlots(games);
  // A series of one is the game you are already looking at.
  if (slots.length < 2) return null;

  // One read for the slots and every substitute of them: a remake somebody
  // played is in their library under its own id, not the base game's.
  const wanted = slots.flatMap((slot) => slot.satisfiedBy);
  const saved = signedIn ? await getLibraryCards(wanted) : null;
  const holdings = new Map(
    (saved?.data ?? []).map((row) => [row.igdb_id, row]),
  );
  const byId = new Map(games.map((one) => [one.id, one]));

  const progress = slots.map((slot) => ({
    slot,
    ...slotProgress(slot, holdings),
  }));
  const played = progress.filter((one) => one.state !== "none").length;
  const finished = progress.filter((one) => one.state === "finished").length;

  return (
    <section className="series-progress">
      <header>
        <div>
          <span>{tri(lang, "SÉRIE", "SERIES", "SERIE")}</span>
          <h2>{game.series.name}</h2>
        </div>
        {signedIn && (
          <p>
            <b>
              {tri(
                lang,
                `${played}/${slots.length} jogados`,
                `${played}/${slots.length} played`,
                `${played}/${slots.length} jugados`,
              )}
            </b>
            <span>
              {tri(
                lang,
                `${finished} concluídos`,
                `${finished} finished`,
                `${finished} completados`,
              )}
            </span>
          </p>
        )}
      </header>
      {signedIn && (
        <div className="series-progress-track">
          {/* Two bars in one: how much has been touched, and how much of that
              was carried to the end. */}
          <i
            data-played
            style={{ width: `${Math.round((played / slots.length) * 100)}%` }}
          />
          <i
            data-finished
            style={{ width: `${Math.round((finished / slots.length) * 100)}%` }}
          />
        </div>
      )}
      <ol className="series-progress-list">
        {progress.map(({ slot, state, via }) => {
          const one = slot.game;
          const stand = via ? byId.get(via) : null;
          const label = via
            ? tri(
                lang,
                `Através de ${stand?.name ?? "outra versão"}`,
                `Through ${stand?.name ?? "another version"}`,
                `A través de ${stand?.name ?? "otra versión"}`,
              )
            : "";
          const mark =
            state === "finished" ? (
              <b className="series-progress-mark" data-done>
                <Check size={12} strokeWidth={3} />
              </b>
            ) : state === "playing" ? (
              <b className="series-progress-mark" data-playing>
                <Gamepad2 size={12} />
              </b>
            ) : state === "library" ? (
              <b className="series-progress-mark">
                <Library size={12} />
              </b>
            ) : null;

          return (
            <li
              key={one.id}
              data-current={one.id === game.id ? "" : undefined}
              data-state={state}
            >
              <Link href={`/${lang}/game/${one.slug}`}>
                <span className="series-progress-cover">
                  <Image
                    src={resolveGameCover(
                      one.coverUrl,
                      holdings.get(one.id)?.custom_cover_url ?? null,
                    )}
                    alt=""
                    fill
                    sizes="88px"
                  />
                  {/* The substitute is discoverable rather than shouted: the
                      mark says how far along, and the tooltip says which game
                      answered for this one. */}
                  {mark && via ? (
                    <Tooltip label={label}>
                      <span className="series-progress-stand">
                        {mark}
                        <Repeat size={9} aria-hidden />
                      </span>
                    </Tooltip>
                  ) : (
                    mark
                  )}
                </span>
                <strong>{one.name}</strong>
                <small>{via ? label : (one.releaseYear ?? "TBA")}</small>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
