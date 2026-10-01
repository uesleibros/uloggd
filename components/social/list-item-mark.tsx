"use client";

import * as Popover from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { Check, Eclipse, PaintRoller, Pipette, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  colorName,
  isPreset,
  MARK_COLORS,
  markName,
  type ItemMark,
  type MarkColor,
} from "@/lib/list-marks";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

const LAST_CUSTOM_COLOR = "uloggd:last-list-mark-color";
const DEFAULT_CUSTOM_COLOR = "#7c5cff";

function lastCustomColor() {
  try {
    const stored = localStorage.getItem(LAST_CUSTOM_COLOR);
    return stored && /^#[0-9a-f]{6}$/i.test(stored)
      ? stored.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

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
  const t = uiText(lang);
  const [open, setOpen] = useState(false);
  const colorInput = useRef<HTMLInputElement>(null);
  // A colour the author typed in rather than one of the nine: it stays on the
  // swatch so a second visit to the popover opens on what they chose.
  const custom = Boolean(
    mark.mark_mode === "COLOR" && mark.mark_color && !isPreset(mark.mark_color),
  );
  const [picked, setPicked] = useState(
    custom ? (mark.mark_color as string) : DEFAULT_CUSTOM_COLOR,
  );
  const label = tri(lang, "Destacar item", "Highlight item", "Destacar ítem");

  function choose(next: ItemMark) {
    onChange(next);
    setOpen(false);
  }

  function changeOpen(next: boolean) {
    if (next)
      setPicked(
        lastCustomColor() ??
          (custom ? (mark.mark_color as string) : DEFAULT_CUSTOM_COLOR),
      );
    setOpen(next);
  }

  function chooseCustom(next: string) {
    const color = next.toLowerCase();
    setPicked(color);
    try {
      localStorage.setItem(LAST_CUSTOM_COLOR, color);
    } catch {
      // The selection still works when this browser blocks local storage.
    }
    onChange({ mark_mode: "COLOR", mark_color: color });
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={changeOpen}>
        <Tooltip label={label}>
          <Popover.Trigger
            className="list-item-mark"
            data-on={mark.mark_mode ? "" : undefined}
            data-color={mark.mark_color ?? undefined}
            disabled={disabled}
            aria-label={`${label}: ${gameName}. ${markName(mark, lang)}.`}
          >
            <PaintRoller size={14} aria-hidden />
          </Popover.Trigger>
        </Tooltip>
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
              {/* The native picker lives outside the popover. The operating
                system's eyedropper can dismiss this surface while it is open,
                and the input must survive long enough to deliver its change. */}
              <button
                type="button"
                className="list-mark-custom"
                data-on={custom ? "" : undefined}
                aria-pressed={custom}
                aria-label={tri(
                  lang,
                  "Cor personalizada",
                  "Custom colour",
                  "Color personalizado",
                )}
                style={
                  {
                    "--mark-ink": custom ? mark.mark_color : picked,
                  } as React.CSSProperties
                }
                onClick={() => colorInput.current?.click()}
              >
                <Pipette size={12} aria-hidden />
              </button>
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
                {t.remove}
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <input
        ref={colorInput}
        className="list-mark-native-color"
        type="color"
        tabIndex={-1}
        value={picked}
        aria-label={tri(
          lang,
          "Cor personalizada",
          "Custom colour",
          "Color personalizado",
        )}
        onChange={(event) => chooseCustom(event.target.value)}
      />
    </>
  );
}

/** The colour names a card needs, without pulling the whole control in. */
export type { MarkColor };
