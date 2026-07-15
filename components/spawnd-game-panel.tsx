"use client";

import {
  ExternalLink,
  Gamepad2,
  Globe2,
  LoaderCircle,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useState } from "react";

type SpawndGamePanelProps = {
  lang: "pt-BR" | "en";
  gameName: string;
  available: boolean;
  gameUrl: string | null;
  embedUrl: string | null;
  catalogUrl: string;
};

type PlayerState = "idle" | "loading" | "loaded" | "error";

export function SpawndGamePanel({
  lang,
  gameName,
  available,
  gameUrl,
  embedUrl,
  catalogUrl,
}: SpawndGamePanelProps) {
  const pt = lang === "pt-BR";
  const href = available && gameUrl ? gameUrl : catalogUrl;

  const [playerState, setPlayerState] =
    useState<PlayerState>("idle");

  const canEmbed = available && Boolean(embedUrl);
  const playerVisible =
    playerState === "loading" || playerState === "loaded";

  const text = pt
    ? {
        embeddedTitle: `Demo de ${gameName} no spawnd`,
        consentTitle: "Jogue sem sair do uloggd",
        consentDescription:
          "O player é fornecido pelo spawnd.gg. Ao carregá-lo, seu navegador se conectará ao serviço externo.",
        loadPlayer: "Carregar e jogar",
        loading: "Carregando demo...",
        playerError: "Não foi possível carregar a demo",
        playerErrorDescription:
          "O player do spawnd não respondeu corretamente. Você pode tentar novamente ou abrir a demo diretamente no spawnd.",
        retry: "Tentar novamente",
        openExternally: "Abrir no spawnd",
        availableTitle: `Jogue a demo de ${gameName}`,
        unavailableTitle: "Demo ainda não disponível",
        availableDescription:
          "Este jogo possui uma demo jogável no spawnd. Você pode executá-la diretamente no navegador, sem precisar instalar o jogo.",
        unavailableDescription:
          "O spawnd ainda não oferece uma demo para este jogo. Enquanto isso, você pode explorar os outros títulos disponíveis no catálogo.",
        playOnSpawnd: "Jogar no spawnd",
        exploreDemos: "Explorar demos",
        howItWorks: "COMO FUNCIONA",
        whatIsSpawnd: "O que é o spawnd?",
        explanation:
          "O spawnd é uma plataforma da Nuuvem para experimentar demos de PC instantaneamente. Os jogos são preparados para a web e executados localmente no navegador — não são transmitidos por streaming.",
        noInstallation: "Sem download ou instalação",
        browser: "Executado diretamente no navegador",
      }
    : {
        embeddedTitle: `${gameName} demo on spawnd`,
        consentTitle: "Play without leaving uloggd",
        consentDescription:
          "The player is provided by spawnd.gg. Loading it will connect your browser to the external service.",
        loadPlayer: "Load and play",
        loading: "Loading demo...",
        playerError: "The demo could not be loaded",
        playerErrorDescription:
          "The spawnd player did not respond correctly. You can try again or open the demo directly on spawnd.",
        retry: "Try again",
        openExternally: "Open on spawnd",
        availableTitle: `Play the ${gameName} demo`,
        unavailableTitle: "Demo not available yet",
        availableDescription:
          "This game has a playable demo on spawnd. You can run it directly in your browser without installing the game.",
        unavailableDescription:
          "spawnd does not currently offer a demo for this game. In the meantime, you can explore the other playable titles in its catalog.",
        playOnSpawnd: "Play on spawnd",
        exploreDemos: "Explore demos",
        howItWorks: "HOW IT WORKS",
        whatIsSpawnd: "What is spawnd?",
        explanation:
          "spawnd is a Nuuvem platform for instantly trying PC demos. Games are prepared for the web and run locally in your browser — they are not streamed.",
        noInstallation: "No download or installation",
        browser: "Runs directly in your browser",
      };

  function loadPlayer() {
    if (!embedUrl) return;

    /*
     * Passar momentaneamente por "idle" recria o iframe
     * quando o usuário tenta novamente após um erro.
     */
    if (playerState === "error") {
      setPlayerState("idle");

      requestAnimationFrame(() => {
        setPlayerState("loading");
      });

      return;
    }

    setPlayerState("loading");
  }

  return (
    <section
      className="spawnd-tab-content"
      aria-labelledby="spawnd-panel-title"
    >
      {canEmbed && (
        <div className="spawnd-player-shell">
          {playerVisible && embedUrl ? (
            <>
              {playerState === "loading" && (
                <div
                  className="spawnd-player-loading"
                  role="status"
                  aria-live="polite"
                >
                  <LoaderCircle
                    size={24}
                    className="spawnd-player-spinner"
                    aria-hidden
                  />
                  <span>{text.loading}</span>
                </div>
              )}

              <iframe
                src={embedUrl}
                title={text.embeddedTitle}
                allow={[
                  "autoplay",
                  "clipboard-read",
                  "clipboard-write",
                  "encrypted-media",
                  "fullscreen",
                  "gamepad",
                  "web-share",
                ].join("; ")}
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={() => setPlayerState("loaded")}
                onError={() => setPlayerState("error")}
              />
            </>
          ) : playerState === "error" ? (
            <div className="spawnd-player-consent">
              <Gamepad2 size={28} aria-hidden />

              <div>
                <h2>{text.playerError}</h2>
                <p>{text.playerErrorDescription}</p>
              </div>

              <div className="spawnd-player-error-actions">
                <button type="button" onClick={loadPlayer}>
                  <RotateCcw size={15} aria-hidden />
                  {text.retry}
                </button>

                {gameUrl && (
                  <a
                    href={gameUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {text.openExternally}
                    <ExternalLink size={15} aria-hidden />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="spawnd-player-consent">
              <Gamepad2 size={28} aria-hidden />

              <div>
                <h2>{text.consentTitle}</h2>
                <p>{text.consentDescription}</p>
              </div>

              <button type="button" onClick={loadPlayer}>
                <Zap size={15} aria-hidden />
                {text.loadPlayer}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="spawnd-panel game-surface">
        <div className="spawnd-panel-primary">
          <span className="spawnd-mark" aria-hidden>
            <Gamepad2 size={22} />
          </span>

          <div>
            <span className="spawnd-eyebrow">SPAWND.GG</span>

            <h2 id="spawnd-panel-title">
              {available
                ? text.availableTitle
                : text.unavailableTitle}
            </h2>

            <p>
              {available
                ? text.availableDescription
                : text.unavailableDescription}
            </p>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {available
                ? text.playOnSpawnd
                : text.exploreDemos}

              <ExternalLink size={15} aria-hidden />
            </a>
          </div>
        </div>

        <div className="spawnd-explainer">
          <header>
            <span>{text.howItWorks}</span>
            <h3>{text.whatIsSpawnd}</h3>
          </header>

          <p>{text.explanation}</p>

          <ul>
            <li>
              <Zap size={15} aria-hidden />
              {text.noInstallation}
            </li>

            <li>
              <Globe2 size={15} aria-hidden />
              {text.browser}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
