"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, EyeOff, Info, LoaderCircle } from "lucide-react";
import { detectSensitiveImage } from "@/lib/nsfw-detection";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The state of the adult-content check on a picked image.
 *
 * `unavailable` is its own state and not a silent `clear`. The check can fail
 * to load, and telling someone their picture passed when nothing looked at it
 * would be worse than saying nothing: it is the difference between a result
 * and the absence of one.
 */
export type ScreeningState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "clear" }
  | { status: "flagged"; reason: string | null }
  | { status: "unavailable" };

/**
 * Runs the check on a file and reports every outcome, including the good one.
 *
 * Reporting a pass matters as much as reporting a flag. Without it the only
 * visible behaviour is an accusation that appears sometimes, so a person who
 * never trips it has no idea a check exists, and one who does has no idea it
 * is routine.
 */
export function useImageScreening() {
  const [state, setState] = useState<ScreeningState>({ status: "idle" });

  const screen = useCallback(async (file: File | null) => {
    if (!file) {
      setState({ status: "idle" });
      return { sensitive: false, checked: false };
    }
    setState({ status: "checking" });
    const result = await detectSensitiveImage(file);
    setState(
      !result.checked
        ? { status: "unavailable" }
        : result.sensitive
          ? { status: "flagged", reason: result.reason }
          : { status: "clear" },
    );
    return result;
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);
  return { state, screen, reset };
}

/**
 * The line under an image picker saying what the check found.
 *
 * `outcome` is what happens when something is found, and it differs by
 * surface. A screenshot or a journal image gets marked and covered, so the
 * wording offers the author a correction. An avatar is shown beside every
 * comment its owner writes, with no way for a reader to decide whether to
 * look, so there the upload is refused instead and the wording says so.
 */
export function ScreeningNotice({
  state,
  lang,
  outcome,
}: {
  state: ScreeningState;
  lang: UiLang;
  outcome: "marks" | "refuses";
}) {
  if (state.status === "idle") return null;

  if (state.status === "checking")
    return (
      <p className="image-screening" data-status="checking">
        <LoaderCircle className="spin" size={13} aria-hidden />
        {tri(
          lang,
          "Verificando a imagem...",
          "Checking the image...",
          "Comprobando la imagen...",
        )}
      </p>
    );

  if (state.status === "clear")
    return (
      <p className="image-screening" data-status="clear" role="status">
        <CheckCircle2 size={13} aria-hidden />
        {tri(
          lang,
          "Imagem verificada, nada sensível encontrado.",
          "Image checked, nothing sensitive found.",
          "Imagen comprobada, no se encontró nada sensible.",
        )}
      </p>
    );

  if (state.status === "unavailable")
    return (
      <p className="image-screening" data-status="unavailable" role="status">
        <Info size={13} aria-hidden />
        {tri(
          lang,
          "Não foi possível verificar a imagem desta vez.",
          "The image could not be checked this time.",
          "No se pudo comprobar la imagen esta vez.",
        )}
      </p>
    );

  return (
    <p className="image-screening" data-status="flagged" role="status">
      <EyeOff size={13} aria-hidden />
      {outcome === "marks"
        ? tri(
            lang,
            "Marcamos como sensível. Desmarque se estiver errado.",
            "We marked this as sensitive. Uncheck it if that is wrong.",
            "Lo marcamos como sensible. Desmárcalo si no corresponde.",
          )
        : tri(
            lang,
            "Esta imagem parece ter conteúdo adulto e não pode ser usada aqui, porque aparece ao lado do seu nome em todo o site.",
            "This image looks like adult content and cannot be used here, because it appears beside your name across the site.",
            "Esta imagen parece contenido adulto y no puede usarse aquí, porque aparece junto a tu nombre en todo el sitio.",
          )}
    </p>
  );
}
