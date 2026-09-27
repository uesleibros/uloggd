import Image from "next/image";
import Link from "next/link";
import { Check, Gamepad2, Library, Repeat } from "lucide-react";
import { DragScroll } from "@/components/drag-scroll";
import { getSeriesGames, type GameDetail } from "@/lib/igdb";
import { getLibraryCards } from "@/lib/library-state";
import { resolveGameCover } from "@/lib/game-cover";
import { seriesSlots, slotProgress } from "@/lib/series-policy";
import { shelfProgress, slotIsIgnored } from "@/lib/series-shelf";
import { SeriesIgnore } from "@/components/series-ignore";
import { serverApi, settleServer } from "@/lib/api-server";
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

  // What this reader has set aside. Theirs alone, and only asked for when
  // there is somebody to ask about: a signed-out visitor has no such list, and
  // the series is still worth drawing for them.
  const { data: skipped } = signedIn
    ? await settleServer(
        serverApi.get<{ data: { igdb_id: number }[] }>("/library/ignored"),
      )
    : { data: null };
  const ignored = new Set((skipped?.data ?? []).map((row) => row.igdb_id));

  const progress = slots.map((slot) => ({
    slot,
    skip: slotIsIgnored(slot, ignored),
    ...slotProgress(slot, holdings),
  }));
  // The counts leave out what was set aside, which is the whole point of
  // setting it aside: a series with a game nobody can reach in it should not
  // say you are behind on it for ever.
  const counted = shelfProgress(slots, holdings, ignored);
  const played = counted.played;
  const finished = counted.finished;

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
                `${played}/${counted.total} jogados`,
                `${played}/${counted.total} played`,
                `${played}/${counted.total} jugados`,
              )}
            </b>
            <span>
              {tri(
                lang,
                `${finished} concluídos`,
                `${finished} finished`,
                `${finished} completados`,
              )}
              {counted.ignored > 0 &&
                tri(
                  lang,
                  ` · ${counted.ignored} ignorados`,
                  ` · ${counted.ignored} ignored`,
                  ` · ${counted.ignored} ignorados`,
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
            style={{
              width: `${Math.round((played / Math.max(1, counted.total)) * 100)}%`,
            }}
          />
          <i
            data-finished
            style={{
              width: `${Math.round((finished / Math.max(1, counted.total)) * 100)}%`,
            }}
          />
        </div>
      )}
      <DragScroll className="series-progress-list" label={game.series.name}>
        <ol>
          {progress.map(({ slot, state, via, skip }) => {
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
                data-ignored={skip || undefined}
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
                {signedIn && (
                  <SeriesIgnore
                    gameId={one.id}
                    slug={one.slug}
                    name={one.name}
                    ignored={skip}
                    lang={lang}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </DragScroll>
    </section>
  );
}
