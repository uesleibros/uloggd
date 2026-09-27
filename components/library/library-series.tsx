import Image from "next/image";
import Link from "next/link";
import { Check, Gamepad2, Library, Layers } from "lucide-react";
import { DragScroll } from "@/components/drag-scroll";
import { getGamesSeries, getSeriesGamesMany } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { serverApi, settleServer } from "@/lib/api-server";
import {
  seriesSlots,
  slotProgress,
  type SlotHolding,
} from "@/lib/series-policy";
import {
  groupBySeries,
  shelfProgress,
  slotIsIgnored,
} from "@/lib/series-shelf";
import { SeriesIgnore } from "@/components/series-ignore";
import { Tooltip } from "@/components/ui/tooltip";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * How far through its series a whole library is.
 *
 * The game page answers this about the series in front of it. Here the
 * question is asked of the shelf, which is a different question with a
 * different cost: one series is two requests to the catalogue, so the library
 * is grouped first and only the few series it is really made of are asked
 * about. Six of them, in two requests, however large the library is.
 *
 * The owner's own, because it is read through their library: somebody else's
 * shelf is not something this can be asked about without asking IGDB on their
 * behalf, and there is no question here that a stranger is owed.
 */
export async function LibrarySeries({ lang }: { lang: UiLang }) {
  const { data: mine } = await settleServer(
    serverApi.get<{
      data: {
        igdb_id: number;
        status: string | null;
        playing: boolean | null;
      }[];
    }>("/library/cards?all=1"),
  );
  const rows = mine?.data ?? [];
  if (rows.length < 4) return null;

  // One read for which series every game is in, batched a hundred at a time
  // and memoised: the second visit to this page costs the catalogue nothing.
  const seriesOf = await getGamesSeries(rows.map((row) => row.igdb_id));
  const held = groupBySeries(rows, seriesOf, { howMany: 6 });
  if (!held.length) return null;

  const memberships = await getSeriesGamesMany(held.map((one) => one.series));
  const holdings = new Map<number, SlotHolding>(
    rows.map((row) => [row.igdb_id, row]),
  );
  // The games this person has set aside. They stay in the row and leave the
  // count: a series holding a broadcast that no longer exists should not tell
  // anybody they are behind on it for ever.
  const { data: skipped } = await settleServer(
    serverApi.get<{ data: { igdb_id: number }[] }>("/library/ignored"),
  );
  const ignored = new Set((skipped?.data ?? []).map((row) => row.igdb_id));

  const shelves = held
    .map((entry) => {
      const games = memberships.get(entry.series.id) ?? [];
      const slots = seriesSlots(games);
      // A series of one is the game itself with a heading over it.
      if (slots.length < 2) return null;
      const progress = shelfProgress(slots, holdings, ignored);
      // Every entry set aside is a series with nothing left to say.
      if (!progress.total) return null;
      return {
        entry,
        slots,
        progress,
        byId: new Map(games.map((one) => [one.id, one])),
      };
    })
    .filter((one) => one !== null);
  if (!shelves.length) return null;

  return (
    <section className="library-series">
      <header>
        <h2>
          <Layers size={14} aria-hidden />{" "}
          {tri(lang, "Séries", "Series", "Series")}
        </h2>
        <p>
          {tri(
            lang,
            "As séries que sua biblioteca tem mais de uma parte. Um remake, um remaster, um port ou uma edição contam pelo jogo que são.",
            "The series your library holds more than one part of. A remake, a remaster, a port or an edition counts for the game it is.",
            "Las series de las que tu biblioteca tiene más de una parte. Un remake, un remaster, un port o una edición cuentan por el juego que son.",
          )}
        </p>
      </header>

      <ol className="library-series-list">
        {shelves.map(({ entry, slots, progress }) => (
          <li key={entry.series.id}>
            <div className="library-series-head">
              <strong>{entry.series.name}</strong>
              <span>
                {tri(
                  lang,
                  `${progress.played}/${progress.total} jogados`,
                  `${progress.played}/${progress.total} played`,
                  `${progress.played}/${progress.total} jugados`,
                )}
                {progress.finished > 0 && (
                  <small>
                    {tri(
                      lang,
                      `${progress.finished} concluídos`,
                      `${progress.finished} finished`,
                      `${progress.finished} completados`,
                    )}
                  </small>
                )}
                {progress.ignored > 0 && (
                  <small>
                    {tri(
                      lang,
                      `${progress.ignored} ignorados`,
                      `${progress.ignored} ignored`,
                      `${progress.ignored} ignorados`,
                    )}
                  </small>
                )}
              </span>
            </div>
            {/* Two bars in one, the way the game page draws it: how much has
                been touched, and how much of that was carried to the end. */}
            <div className="library-series-track">
              <i
                data-played
                style={{
                  width: `${Math.round((progress.played / progress.total) * 100)}%`,
                }}
              />
              <i
                data-finished
                style={{
                  width: `${Math.round((progress.finished / progress.total) * 100)}%`,
                }}
              />
            </div>
            <DragScroll
              className="library-series-covers"
              label={entry.series.name}
            >
              <ol>
                {slots.map((slot) => {
                  const one = slot.game;
                  const skip = slotIsIgnored(slot, ignored);
                  const { state } = slotProgress(slot, holdings);
                  return (
                    <li
                      key={one.id}
                      data-state={state}
                      data-ignored={skip || undefined}
                    >
                      {/* The name on hover through the app's own tooltip: the
                        native one cannot be styled, waits a second, and never
                        appears on a phone. */}
                      <Tooltip label={one.name}>
                        <Link
                          href={`/${lang}/game/${one.slug}`}
                          aria-label={one.name}
                        >
                          <Image
                            src={resolveGameCover(one.coverUrl, null)}
                            alt=""
                            fill
                            sizes="64px"
                          />
                          {state === "finished" ? (
                            <b data-done>
                              <Check size={11} strokeWidth={3} />
                            </b>
                          ) : state === "playing" ? (
                            <b data-playing>
                              <Gamepad2 size={11} />
                            </b>
                          ) : state === "library" ? (
                            <b>
                              <Library size={11} />
                            </b>
                          ) : null}
                        </Link>
                      </Tooltip>
                      <SeriesIgnore
                        gameId={one.id}
                        slug={one.slug}
                        name={one.name}
                        ignored={skip}
                        lang={lang}
                      />
                    </li>
                  );
                })}
              </ol>
            </DragScroll>
            {progress.next && (
              <p className="library-series-next">
                {tri(lang, "A próxima:", "Next up:", "La siguiente:")}{" "}
                <Link href={`/${lang}/game/${progress.next.game.slug}`}>
                  {progress.next.game.name}
                </Link>
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
