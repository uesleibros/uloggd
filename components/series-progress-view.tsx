"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Gamepad2, Library, Repeat } from "lucide-react";
import { DragScroll } from "@/components/drag-scroll";
import { SeriesIgnore } from "@/components/series-ignore";
import { Tooltip } from "@/components/ui/tooltip";
import { useIgnoredGames } from "@/components/use-ignored-games";
import { countSeriesStates, slotIsIgnored } from "@/lib/series-shelf";
import { tri, type UiLang } from "@/lib/ui-text";

import type { SeriesSlotView } from "@/lib/series-view";
export type { SeriesSlotView } from "@/lib/series-view";

/**
 * The series strip on a game's page, with the counting that has to happen
 * here rather than on the server.
 *
 * Setting an entry aside changes four numbers and a sentence: the
 * denominator, the two bars, the "ignored" note and which game comes next.
 * Waiting for a round trip and a re-render to see any of that is what made
 * the control feel broken, so the state lives here and the server is told
 * afterwards.
 */
export function SeriesProgressView({
  seriesName,
  slots,
  currentId,
  ignored: fromServer,
  signedIn,
  lang,
}: {
  seriesName: string;
  slots: SeriesSlotView[];
  currentId: number;
  ignored: number[];
  signedIn: boolean;
  lang: UiLang;
}) {
  const { ignored, toggle, pending, failed } = useIgnoredGames(fromServer);

  // The same policy the server uses, over the states it already worked out:
  // one definition of "how far along is this", wherever it is asked.
  const asSlots = slots.map((slot) => ({
    game: { id: slot.id },
    satisfiedBy: slot.satisfiedBy,
  }));
  const counted = countSeriesStates(slots, ignored);
  const width = (part: number) =>
    `${Math.round((part / Math.max(1, counted.total)) * 100)}%`;

  return (
    <section className="series-progress">
      <header>
        <div>
          <span>{tri(lang, "SÉRIE", "SERIES", "SERIE")}</span>
          <h2>{seriesName}</h2>
        </div>
        {signedIn && (
          <p>
            <b>
              {tri(
                lang,
                `${counted.played}/${counted.total} jogados`,
                `${counted.played}/${counted.total} played`,
                `${counted.played}/${counted.total} jugados`,
              )}
            </b>
            <span>
              {tri(
                lang,
                `${counted.finished} concluídos`,
                `${counted.finished} finished`,
                `${counted.finished} completados`,
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
          <i data-played style={{ width: width(counted.played) }} />
          <i data-finished style={{ width: width(counted.finished) }} />
        </div>
      )}
      <DragScroll className="series-progress-list" label={seriesName}>
        <ol>
          {slots.map((slot, index) => {
            const skip = slotIsIgnored(asSlots[index], ignored);
            const state = slot.state;
            const label = slot.via
              ? tri(
                  lang,
                  `Através de ${slot.via}`,
                  `Through ${slot.via}`,
                  `A través de ${slot.via}`,
                )
              : "";
            const mark =
              state === "finished" ? (
                <b className="series-progress-mark" data-done>
                  <Check size={12} strokeWidth={3} />
                </b>
              ) : state === "playing" || state === "started" ? (
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
                key={slot.id}
                data-current={slot.id === currentId ? "" : undefined}
                data-state={state}
                data-ignored={skip || undefined}
              >
                <Link href={`/${lang}/game/${slot.slug}`}>
                  <span className="series-progress-cover">
                    <Image src={slot.cover} alt="" fill sizes="88px" />
                    {/* The substitute is discoverable rather than shouted: the
                        mark says how far along, and the tooltip says which
                        game answered for this one. */}
                    {mark && slot.via ? (
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
                  <strong>{slot.name}</strong>
                  <small>{slot.via ? label : (slot.year ?? "TBA")}</small>
                </Link>
                {signedIn && (
                  <SeriesIgnore
                    name={slot.name}
                    ignored={skip}
                    pending={pending(slot.id)}
                    lang={lang}
                    onToggle={() => toggle(slot.id, slot.slug)}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </DragScroll>
      {failed && (
        <p className="series-progress-failed" role="status">
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
