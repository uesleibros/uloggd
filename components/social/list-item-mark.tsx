"use client";

import * as Popover from "@/components/ui/popover";
import { Check, Eclipse, PaintRoller, X } from "lucide-react";
import { useState } from "react";
import {
  colorName,
  MARK_COLORS,
  markName,
  type ItemMark,
  type MarkColor,
} from "@/lib/list-marks";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * What an item looks like in this list, chosen by whoever made the list.
 *
 * A roller rather than a star or a tick: a star reads as favourite and a tick
 * reads as done, and the whole point of this control is that the site does
 * not know which of those, if either, the author means. It paints; they
 * decide why.
 *
 * Three things to choose between, one press each, in a popover small enough
 * to sit beside the item it is about.
 */
export function ListItemMark({
  mark,
  gameName,
  lang,
  disabled,
  onChange,
}: {
  mark: ItemMark;
  gameName: string;
  lang: UiLang;
  disabled?: boolean;
  onChange: (next: ItemMark) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = tri(lang, "Destacar item", "Highlight item", "Destacar ítem");

  function choose(next: ItemMark) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="list-item-mark"
        data-on={mark.mark_mode ? "" : undefined}
        data-color={mark.mark_color ?? undefined}
        disabled={disabled}
        aria-label={`${label}: ${gameName}. ${markName(mark, lang)}.`}
        title={label}
      >
        <PaintRoller size={14} aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="list-mark-popover">
          <Popover.Title>{label}</Popover.Title>
          <Popover.Description>
            {tri(
              lang,
              "O significado é seu: explique na descrição da lista.",
              "The meaning is yours: explain it in the list's description.",
              "El significado es tuyo: explícalo en la descripción de la lista.",
            )}
          </Popover.Description>

          <div
            className="list-mark-colors"
            role="group"
            aria-label={tri(lang, "Cores", "Colours", "Colores")}
          >
            {MARK_COLORS.map((color) => {
              const on =
                mark.mark_mode === "COLOR" && mark.mark_color === color;
              return (
                <button
                  key={color}
                  type="button"
                  data-color={color}
                  data-on={on ? "" : undefined}
                  aria-pressed={on}
                  aria-label={colorName(color, lang)}
                  onClick={() =>
                    choose({ mark_mode: "COLOR", mark_color: color })
                  }
                >
                  {on && <Check size={12} strokeWidth={3} aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="list-mark-modes">
            <button
              type="button"
              data-on={mark.mark_mode === "DIM" ? "" : undefined}
              aria-pressed={mark.mark_mode === "DIM"}
              onClick={() => choose({ mark_mode: "DIM", mark_color: null })}
            >
              <Eclipse size={13} aria-hidden />
              {tri(lang, "Ofuscar", "Dim", "Atenuar")}
            </button>
            <button
              type="button"
              data-quiet
              disabled={!mark.mark_mode}
              onClick={() => choose({ mark_mode: null, mark_color: null })}
            >
              <X size={13} aria-hidden />
              {tri(lang, "Remover", "Remove", "Quitar")}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The colour names a card needs, without pulling the whole control in. */
export type { MarkColor };
