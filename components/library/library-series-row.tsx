"use client";
import Image from "next/image";
import Link from "next/link";
import { Check, Gamepad2, Library, Repeat } from "lucide-react";
import { DragScroll } from "@/components/drag-scroll";
import { SeriesIgnore } from "@/components/series-ignore";
import { Tooltip } from "@/components/ui/tooltip";
import { countSeriesStates, seriesStatus } from "@/lib/series-shelf";
import type { LibrarySeriesShelf } from "@/lib/series-view";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function LibrarySeriesRow({
  shelf,
  ignored,
  toggle,
  pending,
  lang,
}: {
  shelf: LibrarySeriesShelf;
  ignored: ReadonlySet<number>;
  toggle: (id: number, slug: string) => void;
  pending: (id: number) => boolean;
  lang: UiLang;
}) {
  const progress = countSeriesStates(shelf.slots, ignored);
  const next = shelf.slots.find((slot) => slot.id === progress.next);
  const status = seriesStatus(progress);
  const done = tri(
    lang,
    `${progress.finished} ${progress.finished === 1 ? "concluído" : "concluídos"}`,
    `${progress.finished} finished`,
    `${progress.finished} ${progress.finished === 1 ? "completado" : "completados"}`,
  );
  const skip = tri(
    lang,
    `${progress.ignored} ${progress.ignored === 1 ? "ignorado" : "ignorados"}`,
    `${progress.ignored} ignored`,
    `${progress.ignored} ${progress.ignored === 1 ? "ignorado" : "ignorados"}`,
  );
  const played = tri(
    lang,
    `${progress.played}/${progress.total} jogados`,
    `${progress.played}/${progress.total} played`,
    `${progress.played}/${progress.total} jugados`,
  );
  const stateLabel = {
    finished: tri(lang, "Concluído", "Finished", "Completado"),
    playing: uiText(lang).playing,
    started: tri(lang, "Iniciado", "Started", "Iniciado"),
    library: tri(
      lang,
      "Na biblioteca, não iniciado",
      "In library, not started",
      "En biblioteca, no iniciado",
    ),
    none: tri(lang, "Não iniciado", "Not started", "No iniciado"),
  };
  return (
    <li data-series-key={shelf.key} data-status={status}>
      <div className="library-series-head">
        <strong>{shelf.name}</strong>
        <span>
          {played}
          <small>{done}</small>
          {progress.ignored > 0 && <small>{skip}</small>}
        </span>
      </div>
      <div
        className="library-series-track"
        role="img"
        aria-label={`${played}, ${done}, ${skip}`}
      >
        <i
          data-played
          style={{
            width: `${(progress.played / Math.max(1, progress.total)) * 100}%`,
          }}
        />
        <i
          data-finished
          style={{
            width: `${(progress.finished / Math.max(1, progress.total)) * 100}%`,
          }}
        />
      </div>
      <DragScroll className="library-series-covers" label={shelf.name}>
        <ol>
          {shelf.slots.map((slot) => {
            const ignoredSlot = ignored.has(slot.id);
            const via = slot.via
              ? tri(
                  lang,
                  `via ${slot.via}`,
                  `via ${slot.via}`,
                  `mediante ${slot.via}`,
                )
              : "";
            const label = `${slot.name}: ${stateLabel[slot.state]}${via ? ` ${via}` : ""}${ignoredSlot ? `, ${tri(lang, "Ignorado", "Ignored", "Ignorado")}` : ""}`;
            return (
              <li
                key={slot.id}
                data-slot-id={slot.id}
                data-state={slot.state}
                data-ignored={ignoredSlot || undefined}
              >
                <Tooltip label={label}>
                  <Link href={`/${lang}/game/${slot.slug}`} aria-label={label}>
                    <Image src={slot.cover} alt="" fill sizes="64px" />
                    {slot.state !== "none" && (
                      <b
                        data-done={slot.state === "finished" || undefined}
                        data-playing={
                          slot.state === "playing" ||
                          slot.state === "started" ||
                          undefined
                        }
                      >
                        {slot.state === "finished" ? (
                          <Check size={11} strokeWidth={3} />
                        ) : slot.state === "library" ? (
                          <Library size={11} />
                        ) : (
                          <Gamepad2 size={11} />
                        )}
                        {slot.via && <Repeat size={9} />}
                      </b>
                    )}
                  </Link>
                </Tooltip>
                <SeriesIgnore
                  name={slot.name}
                  ignored={ignoredSlot}
                  pending={pending(slot.id)}
                  lang={lang}
                  onToggle={() => toggle(slot.id, slot.slug)}
                />
              </li>
            );
          })}
        </ol>
      </DragScroll>
      {shelf.slots.some((slot) => slot.via) && (
        <ul className="library-series-via">
          {shelf.slots
            .filter((slot) => slot.via)
            .map((slot) => (
              <li key={slot.id}>
                {slot.name}: {stateLabel[slot.state]}{" "}
                {tri(
                  lang,
                  `via ${slot.via}`,
                  `via ${slot.via}`,
                  `mediante ${slot.via}`,
                )}
              </li>
            ))}
        </ul>
      )}
      {next && (
        <p className="library-series-next">
          {tri(lang, "A próxima:", "Next up:", "La siguiente:")}{" "}
          <Link href={`/${lang}/game/${next.slug}`}>{next.name}</Link>
        </p>
      )}
    </li>
  );
}
