"use client";

import { useCallback, useState } from "react";
import * as Dialog from "@/components/ui/dialog";
import { CheckCircle2, EyeOff, Info, LoaderCircle, X } from "lucide-react";
import { detectSensitiveImage } from "@/lib/nsfw-detection";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

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
    // Two frames before the work starts. The model classifies on the main
    // thread, so anything painted in the same tick as the call never reaches
    // the screen: the dialog announcing the check would open only after the
    // check it was announcing had finished.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
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
 * Says out loud that a picture is about to be read by a model.
 *
 * Two reasons this is a dialog rather than a line of text. Somebody uploading
 * a screenshot should be told that software is looking at it before it
 * happens, not discover it from a checkbox that moved on its own. And the
 * check briefly holds the main thread, so without something already on screen
 * the interface simply appears to hang.
 *
 * It opens on the frame the file is picked and the check starts two frames
 * later, which is what makes it visible at all.
 */
export function ScreeningDialog({
  state,
  lang,
  outcome,
  onClose,
}: {
  state: ScreeningState;
  lang: UiLang;
  outcome: "marks" | "refuses";
  onClose: () => void;
}) {
  const t = uiText(lang);
  const open = state.status !== "idle";
  const done = state.status !== "checking";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Not closable while it runs: there is nothing to decide yet, and
        // dismissing it would leave the work going with no sign of it.
        if (!next && done) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="verified-dialog-overlay" />
        <Dialog.Content className="verified-dialog screening-dialog">
          {done && (
            <Dialog.Close
              className="verified-dialog-close"
              aria-label={t.close}
            >
              <X size={18} />
            </Dialog.Close>
          )}

          <div className="screening-dialog-mark" data-status={state.status}>
            {state.status === "checking" ? (
              <LoaderCircle className="spin" size={30} aria-hidden />
            ) : state.status === "clear" ? (
              <CheckCircle2 size={30} aria-hidden />
            ) : state.status === "flagged" ? (
              <EyeOff size={30} aria-hidden />
            ) : (
              <Info size={30} aria-hidden />
            )}
          </div>

          <Dialog.Title>
            {state.status === "checking"
              ? tri(
                  lang,
                  "Verificando a imagem",
                  "Checking the image",
                  "Comprobando la imagen",
                )
              : state.status === "clear"
                ? tri(
                    lang,
                    "Nada sensível encontrado",
                    "Nothing sensitive found",
                    "No se encontró nada sensible",
                  )
                : state.status === "flagged"
                  ? tri(
                      lang,
                      "Conteúdo adulto detectado",
                      "Adult content detected",
                      "Contenido adulto detectado",
                    )
                  : tri(
                      lang,
                      "Não deu para verificar",
                      "Could not check",
                      "No se pudo comprobar",
                    )}
          </Dialog.Title>

          <Dialog.Description>
            {state.status === "checking"
              ? tri(
                  lang,
                  "Um modelo de IA está lendo a imagem aqui no seu aparelho. Ela não sai do navegador e não é enviada para ninguém.",
                  "An AI model is reading the image here on your device. It does not leave your browser and is not sent to anyone.",
                  "Un modelo de IA está leyendo la imagen aquí en tu dispositivo. No sale de tu navegador ni se envía a nadie.",
                )
              : state.status === "clear"
                ? tri(
                    lang,
                    "Pode publicar normalmente.",
                    "You can publish as normal.",
                    "Puedes publicar con normalidad.",
                  )
                : state.status === "flagged"
                  ? outcome === "marks"
                    ? tri(
                        lang,
                        "Marcamos a publicação como sensível, então ela fica coberta até alguém escolher ver. Se estiver errado, é só desmarcar.",
                        "We marked the post as sensitive, so it stays covered until someone chooses to look. If that is wrong, just uncheck it.",
                        "Marcamos la publicación como sensible, así queda cubierta hasta que alguien elija verla. Si está mal, solo desmárcalo.",
                      )
                    : tri(
                        lang,
                        "Esta imagem não pode ser usada como foto ou banner, porque aparece ao lado do seu nome em todo o site, sem ninguém escolher vê-la.",
                        "This image cannot be used as a picture or banner, because it appears beside your name across the site with nobody choosing to see it.",
                        "Esta imagen no puede usarse como foto o banner, porque aparece junto a tu nombre en todo el sitio sin que nadie elija verla.",
                      )
                  : tri(
                      lang,
                      "A verificação não carregou desta vez. Você pode continuar; a moderação segue valendo.",
                      "The check did not load this time. You can carry on; moderation still applies.",
                      "La comprobación no cargó esta vez. Puedes continuar; la moderación sigue vigente.",
                    )}
          </Dialog.Description>

          {done && (
            <button
              type="button"
              className="screening-dialog-close"
              onClick={onClose}
            >
              {tri(lang, "Entendi", "Got it", "Entendido")}
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
