"use client";

import { RotateCcw, WifiOff } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * A read that failed, said as a failure.
 *
 * Sections that fetch for themselves used to fall through to their empty
 * state when the request failed: the search said there were no games for the
 * filters, the library said there was nothing in it. Both are claims about the
 * data, and neither was true; the data was simply not there to look at. This is
 * what they show instead, with the one useful thing to do about it.
 */
export function LoadError({
  lang,
  onRetry,
  what,
}: {
  lang: UiLang;
  onRetry: () => void;
  /** What could not be loaded, as a phrase: "a sua biblioteca", "os jogos". */
  what?: string;
}) {
  return (
    <div className="load-error" role="alert">
      <span aria-hidden>
        <WifiOff size={20} />
      </span>
      <p>
        {what
          ? tri(
              lang,
              `Não foi possível carregar ${what}.`,
              `Could not load ${what}.`,
              `No se pudo cargar ${what}.`,
            )
          : tri(
              lang,
              "Não foi possível carregar isto agora.",
              "This could not be loaded right now.",
              "No se pudo cargar esto ahora.",
            )}
      </p>
      <button type="button" onClick={onRetry}>
        <RotateCcw size={14} />
        {tri(lang, "Tentar de novo", "Try again", "Intentar de nuevo")}
      </button>
    </div>
  );
}
