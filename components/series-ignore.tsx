"use client";

import { EyeOff, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
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
 */
export function SeriesIgnore({
  gameId,
  slug,
  name,
  ignored,
  lang,
}: {
  gameId: number;
  slug: string;
  name: string;
  ignored: boolean;
  lang: UiLang;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
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

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (ignored) await api.delete(`/library/ignored/${gameId}`);
      else
        await api.post("/library/ignored", {
          igdb_id: gameId,
          game_slug: slug,
        });
      router.refresh();
    } catch {
      // Nothing to say here that the unchanged mark does not already say.
    }
    setBusy(false);
  }

  return (
    <Tooltip label={label}>
      <button
        type="button"
        className="series-ignore"
        data-on={ignored || undefined}
        disabled={busy}
        aria-label={label}
        aria-pressed={ignored}
        onClick={toggle}
      >
        {ignored ? <Undo2 size={11} /> : <EyeOff size={11} />}
      </button>
    </Tooltip>
  );
}
