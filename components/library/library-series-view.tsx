"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Gamepad2, Library, Layers } from "lucide-react";
import { DragScroll } from "@/components/drag-scroll";
import { SeriesIgnore } from "@/components/series-ignore";
import { Tooltip } from "@/components/ui/tooltip";
import { useIgnoredGames } from "@/components/use-ignored-games";
import type { SeriesSlotView } from "@/components/series-progress-view";
import { shelfProgress, slotIsIgnored } from "@/lib/series-shelf";
import { tri, type UiLang } from "@/lib/ui-text";

export type LibrarySeriesShelf = {
  id: number;
  name: string;
  slots: SeriesSlotView[];
};

/**
 * The series a library is made of, drawn.
 *
 * The reading is upstairs in the server component: which series the shelf
 * holds, what is in each one, and how far along every entry is. What happens
 * here is the part that has to answer a finger: setting an entry aside takes
 * it out of the denominator, moves both bars and changes which game comes
 * next, all in the press rather than a round trip later.
 */
export function LibrarySeriesView({
  shelves,
  ignored: fromServer,
  lang,
}: {
  shelves: LibrarySeriesShelf[];
  ignored: number[];
  lang: UiLang;
}) {
  const { ignored, toggle, pending, failed } = useIgnoredGames(fromServer, {
    refreshOnSettled: false,
  });

  // Every shelf recounted against what is set aside now, with the same
  // function the server uses: one definition of the denominator, wherever the
  // question is asked.
  const counted = shelves.map((shelf) => {
    const slots = shelf.slots.map((slot) => ({
      game: { id: slot.id },
      satisfiedBy: slot.satisfiedBy,
    }));
    const holdings = new Map(
      shelf.slots
        .filter((slot) => slot.state !== "none")
        .map((slot) => [
          slot.id,
          {
            igdb_id: slot.id,
            status: slot.state === "finished" ? "COMPLETED" : null,
            playing: slot.state === "playing",
          },
        ]),
    );
    const progress = shelfProgress(slots, holdings, ignored);
    const next = progress.next
      ? shelf.slots.find((slot) => slot.id === progress.next?.game.id)
      : null;
    return { shelf, slots, progress, next };
  });

  if (!counted.length) return null;

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
        {counted.map(({ shelf, slots, progress, next }) => (
          <li key={shelf.id}>
            <div className="library-series-head">
              <strong>{shelf.name}</strong>
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
                  width: `${Math.round((progress.played / Math.max(1, progress.total)) * 100)}%`,
                }}
              />
              <i
                data-finished
                style={{
                  width: `${Math.round((progress.finished / Math.max(1, progress.total)) * 100)}%`,
                }}
              />
            </div>
            <DragScroll className="library-series-covers" label={shelf.name}>
              <ol>
                {shelf.slots.map((slot, index) => {
                  const skip = slotIsIgnored(slots[index], ignored);
                  return (
                    <li
                      key={slot.id}
                      data-state={slot.state}
                      data-ignored={skip || undefined}
                    >
                      {/* The name on hover through the app's own tooltip: the
                          native one cannot be styled, waits a second, and
                          never appears on a phone. */}
                      <Tooltip label={slot.name}>
                        <Link
                          href={`/${lang}/game/${slot.slug}`}
                          aria-label={slot.name}
                        >
                          <Image src={slot.cover} alt="" fill sizes="64px" />
                          {slot.state === "finished" ? (
                            <b data-done>
                              <Check size={11} strokeWidth={3} />
                            </b>
                          ) : slot.state === "playing" ? (
                            <b data-playing>
                              <Gamepad2 size={11} />
                            </b>
                          ) : slot.state === "library" ? (
                            <b>
                              <Library size={11} />
                            </b>
                          ) : null}
                        </Link>
                      </Tooltip>
                      <SeriesIgnore
                        name={slot.name}
                        ignored={skip}
                        pending={pending(slot.id)}
                        lang={lang}
                        onToggle={() => toggle(slot.id, slot.slug)}
                      />
                    </li>
                  );
                })}
              </ol>
            </DragScroll>
            {next && (
              <p className="library-series-next">
                {tri(lang, "A próxima:", "Next up:", "La siguiente:")}{" "}
                <Link href={`/${lang}/game/${next.slug}`}>{next.name}</Link>
              </p>
            )}
          </li>
        ))}
      </ol>
      {failed && (
        <p className="library-series-failed" role="status">
          {tri(
            lang,
            "Não deu para salvar isso agora.",
            "That could not be saved right now.",
            "No se pudo guardar eso ahora.",
          )}
        </p>
      )}
    </section>
  );
}
