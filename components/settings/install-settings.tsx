"use client";

import { Check, Download, Share, SquarePlus, Smartphone } from "lucide-react";
import { useInstallState } from "@/lib/use-install-state";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Installing uloggd, from settings.
 *
 * The banner is dismissible and remembered, which is right for a banner and
 * wrong as the only way in: someone who said no in March should still be able
 * to change their mind in June without clearing site data. This is that way in,
 * and it also answers the question the banner cannot, which is whether the app
 * is already installed.
 *
 * Shares `useInstallState` with the banner so the two can never disagree about
 * that, which would read as the site not knowing what it is.
 */
export function InstallSettings({ lang }: { lang: UiLang }) {
  const { state, install } = useInstallState();

  return (
    <section className="push-settings">
      <header>
        <span>
          {state === "installed" ? (
            <Check size={20} />
          ) : (
            <Smartphone size={20} />
          )}
        </span>
        <div>
          <small>{tri(lang, "APLICATIVO", "APP", "APLICACIÓN")}</small>
          <h2>
            {state === "installed"
              ? tri(
                  lang,
                  "uloggd instalado",
                  "uloggd installed",
                  "uloggd instalado",
                )
              : tri(
                  lang,
                  "Instalar o uloggd",
                  "Install uloggd",
                  "Instalar uloggd",
                )}
          </h2>
          <p>
            {state === "installed"
              ? tri(
                  lang,
                  "Você está usando o uloggd instalado, abrindo direto da tela inicial. Para remover, use a opção de desinstalar do próprio sistema.",
                  "You are using uloggd installed, opening straight from your home screen. To remove it, use your system's uninstall option.",
                  "Estás usando uloggd instalado, abriéndose desde tu pantalla de inicio. Para quitarlo, usa la opción de desinstalar del sistema.",
                )
              : state === "ready"
                ? tri(
                    lang,
                    "Abre sem barra de navegador e recebe avisos com o app fechado. Ocupa poucos megabytes.",
                    "Opens without browser chrome and receives alerts while closed. It takes only a few megabytes.",
                    "Se abre sin barra del navegador y recibe avisos con la app cerrada. Ocupa pocos megabytes.",
                  )
                : state === "manual"
                  ? tri(
                      lang,
                      "No iPhone a instalação é manual, e é o que libera as notificações push por lá.",
                      "On iPhone the install is manual, and it is what enables push notifications there.",
                      "En iPhone la instalación es manual, y es lo que habilita las notificaciones push allí.",
                    )
                  : tri(
                      lang,
                      "Este navegador não oferece instalação, ou o uloggd ainda não é elegível nele. No computador, procure o ícone de instalar na barra de endereço.",
                      "This browser does not offer installing, or uloggd is not eligible in it yet. On desktop, look for the install icon in the address bar.",
                      "Este navegador no ofrece instalación, o uloggd aún no es elegible en él. En escritorio, busca el icono de instalar en la barra de direcciones.",
                    )}
          </p>
        </div>
      </header>

      {state === "ready" && (
        <div className="push-settings-body">
          <button
            type="button"
            className="push-settings-enable"
            onClick={() => void install()}
          >
            <Download size={15} />
            {tri(lang, "Instalar agora", "Install now", "Instalar ahora")}
          </button>
        </div>
      )}

      {state === "manual" && (
        <div className="push-settings-body">
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
        </div>
      )}
    </section>
  );
}
