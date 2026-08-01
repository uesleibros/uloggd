"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useInstallState } from "@/lib/use-install-state";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Offers to install uloggd, on the browsers that can and with instructions on
 * the one that cannot.
 *
 * The browser already offers this on its own, buried in a menu almost nobody
 * opens. `beforeinstallprompt` does not replace that flow, it defers it: the
 * event is captured, the browser stays quiet, and calling `prompt()` later
 * opens the same native dialog from a place someone will actually see.
 *
 * iOS Safari never fires the event and has no programmatic install at all, so
 * there the only honest thing is to say which two taps do it. This is why the
 * component is worth writing rather than leaving to the browser: one platform
 * needs interception, the other needs words, and neither is served by doing
 * nothing.
 *
 * Shown once and remembered. An install offer that reappears after being
 * dismissed stops reading as an offer.
 */
const STORAGE_KEY = "uloggd_install_prompt_v1";

/** Long enough that a dismissal sticks, short enough that a change of mind is served. */
const SNOOZE_DAYS = 60;

function snoozed() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    const until = Number(saved);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    // Storage blocked. Treating that as "not snoozed" would show this banner on
    // every page load, which is worse than never showing it. The settings card
    // stays reachable either way.
    return true;
  }
}

export function InstallPrompt({ lang }: { lang: UiLang }) {
  const { state, install } = useInstallState();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch {
      // Nothing to do: it simply reappears next session.
    }
    window.setTimeout(() => setVisible(false), 200);
  }, []);

  useEffect(() => {
    if (state === "installed" || state === "unavailable") return;
    if (snoozed()) return;
    // iOS has no event to wait for, so a delay stands in for one: a banner
    // during first paint reads as an ad rather than as an offer.
    const delay = state === "manual" ? 4000 : 0;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function accept() {
    // Either answer ends this: accepting installs, and declining is a decision
    // that deserves to be respected rather than asked again on the next page.
    await install();
    dismiss();
  }

  if (!visible) return null;

  return (
    <aside
      className="install-prompt"
      data-leaving={leaving || undefined}
      role="dialog"
      aria-label={tri(
        lang,
        "Instalar o uloggd",
        "Install uloggd",
        "Instalar uloggd",
      )}
    >
      <span className="install-prompt-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} />
      </span>
      <div className="install-prompt-copy">
        <strong>
          {tri(lang, "Instale o uloggd", "Install uloggd", "Instala uloggd")}
        </strong>
        {state === "ready" ? (
          <p>
            {tri(
              lang,
              "Abre direto da tela inicial, sem barra de navegador, e avisa quando alguém interagir com você.",
              "Opens straight from your home screen, without browser chrome, and tells you when someone interacts with you.",
              "Se abre desde tu pantalla de inicio, sin barra del navegador, y te avisa cuando alguien interactúa contigo.",
            )}
          </p>
        ) : (
          <p className="install-prompt-steps">
            {tri(lang, "Toque em", "Tap", "Toca")}{" "}
            <Share size={13} aria-hidden="true" />
            <b>{tri(lang, "Compartilhar", "Share", "Compartir")}</b>{" "}
            {tri(lang, "e depois", "then", "y luego")}{" "}
            <SquarePlus size={13} aria-hidden="true" />
            <b>
              {tri(
                lang,
                "Adicionar à Tela de Início",
                "Add to Home Screen",
                "Añadir a inicio",
              )}
            </b>
          </p>
        )}
      </div>
      {state === "ready" && (
        <button
          type="button"
          className="install-prompt-accept"
          onClick={accept}
        >
          <Download size={15} />
          {tri(lang, "Instalar", "Install", "Instalar")}
        </button>
      )}
      <button
        type="button"
        className="install-prompt-close"
        onClick={dismiss}
        aria-label={tri(lang, "Dispensar", "Dismiss", "Descartar")}
      >
        <X size={16} />
      </button>
    </aside>
  );
}
