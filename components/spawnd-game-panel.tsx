"use client";

import {
  Clock3,
  ExternalLink,
  Gamepad2,
  Globe2,
  LoaderCircle,
  Monitor,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { SpawndLogo } from "./spawnd-logo";
import { tri, type UiLang } from "@/lib/ui-text";

/** What the catalogue knows about one game, as `lib/spawnd.ts` hands it over. */
export type SpawndGame = {
  id: number;
  steamAppId: number | null;
  name: string;
  status: string;
  gameType: string;
  platforms: string[];
  stores: Record<string, string>;
  wishlistUrl: string | null;
  description: string | null;
};

type SpawndGamePanelProps = {
  lang: UiLang;
  gameName: string;
  available: boolean;
  gameUrl: string | null;
  embedUrl: string | null;
  catalogUrl: string;
  /** Null when spawnd has never heard of this game. */
  game: SpawndGame | null;
};

type PlayerState = "idle" | "loading" | "loaded" | "error";

const PLATFORMS: Record<string, string> = {
  windows: "Windows",
  mac_os: "macOS",
  steam_os: "SteamOS",
};

const STORES: Record<string, string> = {
  steam: "Steam",
  epic: "Epic Games",
  gog: "GOG",
  itch: "itch.io",
};

/**
 * The demo, and everything the catalogue knows about it.
 *
 * The panel used to say "there is a demo" or "there is not" and stop there,
 * while the file behind it carried which platforms the demo runs on, whether
 * the full game is out yet, where it is sold and where to wishlist it. A
 * reader deciding whether to spend twenty minutes on a demo wants those, and
 * every one of them was already on disk.
 *
 * The copy used to be two objects, Portuguese or English, so a Spanish reader
 * got the English one. It goes through `tri` like the rest of the site now.
 */
export function SpawndGamePanel({
  lang,
  gameName,
  available,
  gameUrl,
  embedUrl,
  catalogUrl,
  game,
}: SpawndGamePanelProps) {
  const href = available && gameUrl ? gameUrl : catalogUrl;
  const [playerState, setPlayerState] = useState<PlayerState>("idle");

  const canEmbed = available && Boolean(embedUrl);
  const playerVisible = playerState === "loading" || playerState === "loaded";
  const released = game?.status === "published";
  // Six of the catalogue's rows have no status at all. Drawing the row anyway
  // would say "coming soon" about games nobody said that about.
  const knownStatus =
    game?.status === "published" || game?.status === "coming_soon";
  const platforms = (game?.platforms ?? [])
    .map((one) => PLATFORMS[one])
    .filter(Boolean);
  const stores = Object.entries(game?.stores ?? {});

  const text = {
    embeddedTitle: tri(
      lang,
      `Demo de ${gameName} no spawnd`,
      `${gameName} demo on spawnd`,
      `Demo de ${gameName} en spawnd`,
    ),
    consentTitle: tri(
      lang,
      "Jogue sem sair do uloggd",
      "Play without leaving uloggd",
      "Juega sin salir de uloggd",
    ),
    consentDescription: tri(
      lang,
      "O player é fornecido pelo spawnd.gg. Ao carregá-lo, seu navegador se conectará ao serviço externo.",
      "The player is provided by spawnd.gg. Loading it will connect your browser to the external service.",
      "El reproductor lo provee spawnd.gg. Al cargarlo, tu navegador se conectará al servicio externo.",
    ),
    loadPlayer: tri(
      lang,
      "Carregar e jogar",
      "Load and play",
      "Cargar y jugar",
    ),
    loading: tri(
      lang,
      "Carregando demo...",
      "Loading demo...",
      "Cargando demo...",
    ),
    playerError: tri(
      lang,
      "Não foi possível carregar a demo",
      "The demo could not be loaded",
      "No se pudo cargar la demo",
    ),
    playerErrorDescription: tri(
      lang,
      "O player do spawnd não respondeu corretamente. Você pode tentar novamente ou abrir a demo diretamente no spawnd.",
      "The spawnd player did not respond correctly. You can try again or open the demo directly on spawnd.",
      "El reproductor de spawnd no respondió correctamente. Puedes intentarlo otra vez o abrir la demo directamente en spawnd.",
    ),
    retry: tri(lang, "Tentar novamente", "Try again", "Intentar de nuevo"),
    openExternally: tri(
      lang,
      "Abrir no spawnd",
      "Open on spawnd",
      "Abrir en spawnd",
    ),
    availableTitle: tri(
      lang,
      `Jogue a demo de ${gameName}`,
      `Play the ${gameName} demo`,
      `Juega la demo de ${gameName}`,
    ),
    unavailableTitle: tri(
      lang,
      "Demo ainda não disponível",
      "Demo not available yet",
      "Demo aún no disponible",
    ),
    availableDescription: tri(
      lang,
      "Este jogo tem uma demo jogável no spawnd. Ela roda direto no navegador, sem instalar nada.",
      "This game has a playable demo on spawnd. It runs in your browser with nothing to install.",
      "Este juego tiene una demo jugable en spawnd. Se ejecuta en el navegador, sin instalar nada.",
    ),
    unavailableDescription: tri(
      lang,
      "O spawnd ainda não oferece uma demo para este jogo. Enquanto isso, você pode explorar os outros títulos do catálogo.",
      "spawnd does not currently offer a demo for this game. In the meantime, you can explore the other playable titles in its catalog.",
      "spawnd todavía no ofrece una demo para este juego. Mientras tanto, puedes explorar los otros títulos del catálogo.",
    ),
    playOnSpawnd: tri(
      lang,
      "Jogar no spawnd",
      "Play on spawnd",
      "Jugar en spawnd",
    ),
    exploreDemos: tri(
      lang,
      "Explorar demos",
      "Explore demos",
      "Explorar demos",
    ),
    howItWorks: tri(lang, "COMO FUNCIONA", "HOW IT WORKS", "CÓMO FUNCIONA"),
    whatIsSpawnd: tri(
      lang,
      "O que é o spawnd?",
      "What is spawnd?",
      "¿Qué es spawnd?",
    ),
    explanation: tri(
      lang,
      "O spawnd é uma plataforma da Nuuvem para experimentar demos de PC instantaneamente. Os jogos são preparados para a web e executados localmente no navegador, não por streaming.",
      "spawnd is a Nuuvem platform for instantly trying PC demos. Games are prepared for the web and run locally in your browser, not streamed.",
      "spawnd es una plataforma de Nuuvem para probar demos de PC al instante. Los juegos se preparan para la web y se ejecutan localmente en el navegador, no por streaming.",
    ),
    noInstallation: tri(
      lang,
      "Sem download ou instalação",
      "No download or installation",
      "Sin descarga ni instalación",
    ),
    browser: tri(
      lang,
      "Executado diretamente no navegador",
      "Runs directly in your browser",
      "Se ejecuta directamente en el navegador",
    ),
    facts: tri(lang, "A DEMO", "THE DEMO", "LA DEMO"),
    released: tri(
      lang,
      "Jogo completo já lançado",
      "Full game out now",
      "Juego completo ya lanzado",
    ),
    upcoming: tri(
      lang,
      "Jogo completo em breve",
      "Full game coming soon",
      "Juego completo próximamente",
    ),
    runsOn: tri(lang, "Roda em", "Runs on", "Funciona en"),
    buy: tri(lang, "Onde comprar", "Where to buy", "Dónde comprar"),
    wishlist: tri(
      lang,
      "Adicionar à lista de desejos",
      "Add to wishlist",
      "Añadir a la lista de deseos",
    ),
  };

  function loadPlayer() {
    if (!embedUrl) return;
    // Passing through "idle" for a frame rebuilds the iframe, which is what a
    // retry after an error needs.
    if (playerState === "error") {
      setPlayerState("idle");
      requestAnimationFrame(() => setPlayerState("loading"));
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
                  <a href={gameUrl} target="_blank" rel="noopener noreferrer">
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
            <SpawndLogo compact />
          </span>

          <div>
            <SpawndLogo />

            <h2 id="spawnd-panel-title">
              {available ? text.availableTitle : text.unavailableTitle}
            </h2>

            <p>
              {available
                ? (game?.description ?? text.availableDescription)
                : text.unavailableDescription}
            </p>

            <a href={href} target="_blank" rel="noopener noreferrer">
              {available ? text.playOnSpawnd : text.exploreDemos}

              <ExternalLink size={15} aria-hidden />
            </a>
          </div>
        </div>

        {/* Everything the catalogue already knew and the panel never said. */}
        {available && game && (
          <div className="spawnd-facts">
            <header>
              <span>{text.facts}</span>
            </header>

            <dl>
              {knownStatus && (
                <div>
                  <dt>
                    {released ? (
                      <Sparkles size={14} aria-hidden />
                    ) : (
                      <Clock3 size={14} aria-hidden />
                    )}
                    {tri(lang, "Situação", "Status", "Situación")}
                  </dt>
                  <dd>{released ? text.released : text.upcoming}</dd>
                </div>
              )}

              {platforms.length > 0 && (
                <div>
                  <dt>
                    <Monitor size={14} aria-hidden />
                    {text.runsOn}
                  </dt>
                  <dd>{platforms.join(" · ")}</dd>
                </div>
              )}

              {stores.length > 0 && (
                <div>
                  <dt>
                    <ShoppingBag size={14} aria-hidden />
                    {text.buy}
                  </dt>
                  <dd>
                    {stores.map(([store, url]) => (
                      <a
                        key={store}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        {STORES[store] ?? store}
                        <ExternalLink size={12} aria-hidden />
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            {/* Only when it goes somewhere the stores above do not: for most
                of the catalogue the wishlist is the Steam page already
                listed, and a second link to it is a second link to it. */}
            {game.wishlistUrl &&
              !stores.some(([, url]) => url === game.wishlistUrl) && (
                <a
                  className="spawnd-wishlist"
                  href={game.wishlistUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {text.wishlist}
                  <ExternalLink size={13} aria-hidden />
                </a>
              )}
          </div>
        )}

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
