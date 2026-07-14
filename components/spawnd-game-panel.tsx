import { ExternalLink, Gamepad2, Globe2, Zap } from "lucide-react";

export function SpawndGamePanel({
  lang,
  gameName,
  available,
  gameUrl,
  catalogUrl,
}: {
  lang: "pt-BR" | "en";
  gameName: string;
  available: boolean;
  gameUrl: string | null;
  catalogUrl: string;
}) {
  const pt = lang === "pt-BR";
  const href = gameUrl ?? catalogUrl;

  return (
    <section className="spawnd-panel game-surface">
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
            {pt ? "Sem download ou instalação" : "No download or installation"}
          </li>
          <li>
            <Globe2 size={15} />
            {pt ? "Direto no navegador" : "Runs directly in your browser"}
          </li>
        </ul>
      </div>
    </section>
  );
}
