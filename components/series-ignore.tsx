"use client";

import { EyeOff, Undo2 } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Setting one game of a series aside, or taking it back.
 *
 * Some entries cannot be played by anybody: a Satellaview broadcast from 1997,
 * a phone game whose servers closed, a regional release that never left Japan.
 * Others simply are not wanted. Counting those against somebody for ever makes
 * the progress bar a lie in the direction that feels worst, so they leave the
 * denominator instead.
 *
 * The game stays in the row, dimmed and struck, because the gap is still part
 * of the series. This is not "dropped", which is about a game that was played.
 *
 * The press itself belongs to whoever draws the strip: the mark, the
 * denominator, the bars and the next game all change together, so one place
 * holds that state and this is the control over it. It is never disabled
 * while a request is in flight, because being unable to undo a press for as
 * long as the network takes is the thing that made this feel broken.
 */
export function SeriesIgnore({
  name,
  ignored,
  pending,
  lang,
  onToggle,
}: {
  name: string;
  ignored: boolean;
  pending?: boolean;
  lang: UiLang;
  onToggle: () => void;
}) {
  const label = ignored
    ? tri(
        lang,
        `Voltar a contar ${name}`,
        `Count ${name} again`,
        `Volver a contar ${name}`,
      )
    : tri(
        lang,
        `Ignorar ${name}: não entra na conta`,
        `Ignore ${name}: it stops counting`,
        `Ignorar ${name}: deja de contar`,
      );

  return (
    <Tooltip label={label}>
      <button
        type="button"
        className="series-ignore"
        data-on={ignored || undefined}
        data-pending={pending || undefined}
        aria-label={label}
        aria-pressed={ignored}
        onClick={(event) => {
          // The strip around this is dragged, and a cover is a link: neither
          // should happen because somebody pressed the small round button in
          // its corner.
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
      >
        {ignored ? <Undo2 size={11} /> : <EyeOff size={11} />}
      </button>
    </Tooltip>
  );
}
