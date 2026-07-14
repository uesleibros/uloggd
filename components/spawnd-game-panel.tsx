"use client";

import { ExternalLink, Gamepad2, Globe2, Zap } from "lucide-react";
import { useState } from "react";

export function SpawndGamePanel({
  lang,
  gameName,
  available,
  gameUrl,
  embedUrl,
  catalogUrl,
}: {
  lang: "pt-BR" | "en";
  gameName: string;
  available: boolean;
  gameUrl: string | null;
  embedUrl: string | null;
  catalogUrl: string;
}) {
  const pt = lang === "pt-BR";
  const href = gameUrl ?? catalogUrl;
  const [playerLoaded, setPlayerLoaded] = useState(false);

  return (
    <section className="spawnd-tab-content">
      {embedUrl && (
        <div className="spawnd-player-shell">
          {playerLoaded ? (
            <iframe
              src={embedUrl}
              title={
                pt
                  ? `Demo de ${gameName} no spawnd`
                  : `${gameName} demo on spawnd`
              }
              allow="autoplay; encrypted-media; clipboard-write; clipboard-read; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="spawnd-player-consent">
              <Gamepad2 size={28} />
              <div>
                <h2>
                  {pt ? "Jogue sem sair do uloggd" : "Play inside uloggd"}
                </h2>
                <p>
                  {pt
                    ? "O player é fornecido pelo spawnd.gg. Ao carregá-lo, seu navegador se conecta ao serviço externo."
                    : "The player is provided by spawnd.gg. Loading it connects your browser to the external service."}
                </p>
              </div>
              <button type="button" onClick={() => setPlayerLoaded(true)}>
                <Zap size={15} />
                {pt ? "Carregar e jogar" : "Load and play"}
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
            <h2>
              {available
                ? pt
                  ? `Jogue a demo de ${gameName}`
                  : `Play the ${gameName} demo`
                : pt
                  ? "Demo ainda não disponível"
                  : "Demo not available yet"}
            </h2>
            <p>
              {available
                ? pt
                  ? "Este jogo possui uma experiência jogável no spawnd. Abra e comece direto pelo navegador."
                  : "This game has a playable experience on spawnd. Open it and start directly in your browser."
                : pt
                  ? "O spawnd ainda não oferece uma demo confirmada para este jogo. Você pode explorar os títulos disponíveis no catálogo."
                  : "spawnd does not have a confirmed demo for this game yet. You can explore the playable catalog instead."}
            </p>
            <a href={href} target="_blank" rel="noreferrer">
              {available
                ? pt
                  ? "Jogar no spawnd"
                  : "Play on spawnd"
                : pt
                  ? "Explorar demos"
                  : "Explore demos"}
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        <div className="spawnd-explainer">
          <header>
            <span>{pt ? "COMO FUNCIONA" : "HOW IT WORKS"}</span>
            <h3>{pt ? "O que é o spawnd?" : "What is spawnd?"}</h3>
          </header>
          <p>
            {pt
              ? "O spawnd é uma plataforma da Nuuvem para experimentar demos premium de PC instantaneamente. Os jogos são preparados para a web e executados localmente no navegador — não são transmitidos por streaming."
              : "spawnd is a Nuuvem platform for instantly trying premium PC demos. Games are built for the web and run locally in your browser — they are not streamed."}
          </p>
          <ul>
            <li>
              <Zap size={15} />
              {pt
                ? "Sem download ou instalação"
                : "No download or installation"}
            </li>
            <li>
              <Globe2 size={15} />
              {pt ? "Direto no navegador" : "Runs directly in your browser"}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
