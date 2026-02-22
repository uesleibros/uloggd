import { useState } from "react"
import QuickActions from "@components/Game/QuickActions"
import ReviewButton from "@components/Game/ReviewButton"
import GameReviews from "@components/Game/GameReviews"
import { StatCard } from "../components/StatCard"
import { InfoRow } from "../components/InfoRow"
import { HowLongToBeat } from "../components/HowLongToBeat"
import { GameHeader } from "./GameHeader"

export function GameContent({ game, hltb, hltbLoading, onOpenLightbox }) {
  const [showFullSummary, setShowFullSummary] = useState(false)

  const allMedia = [...(game.screenshots || []), ...(game.artworks || [])]
  const summaryTruncated = game.summary?.length > 500

  return (
    <div className="flex-1 min-w-0">
      <GameHeader game={game} />

      <div className="hidden md:block mb-6">
        <QuickActions game={game} />
        <ReviewButton game={game} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={game.total_rating_count} label="Avaliações" />
        <StatCard value={game.hypes} label="Hype" />
        <StatCard value={game.platforms?.length} label="Plataforma(s)" />
      </div>

      {game.summary && (
        <div>
          <hr className="my-6 border-zinc-700" />
          <h2 className="text-lg font-semibold text-white mb-2">Sobre</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {summaryTruncated && !showFullSummary
              ? game.summary.slice(0, 500) + "."
              : game.summary}
          </p>
          {summaryTruncated && (
            <button
              onClick={() => setShowFullSummary(!showFullSummary)}
              className="text-sm cursor-pointer text-zinc-500 hover:text-white mt-2 transition-colors"
            >
              {showFullSummary ? "Mostrar menos" : "Ler mais"}
            </button>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <InfoRow label="Desenvolvedora">{game.developers?.join(", ")}</InfoRow>
        <InfoRow label="Publicadora">{game.publishers?.join(", ")}</InfoRow>
        <InfoRow label="Gêneros">{game.genres?.map((g) => g.name).join(", ")}</InfoRow>
        <InfoRow label="Temas">{game.themes?.map((t) => t.name).join(", ")}</InfoRow>
        <InfoRow label="Modos">{game.game_modes?.map((m) => m.name).join(", ")}</InfoRow>
        <InfoRow label="Engine">{game.game_engines?.map((e) => e.name).join(", ")}</InfoRow>
      </div>

      <HowLongToBeat hltb={hltb} loading={hltbLoading} />

      {allMedia.length > 0 && (
        <div>
          <hr className="my-6 border-zinc-700" />
          <h2 className="text-lg font-semibold text-white mb-4">
            Capturas de tela/Artes
            <span className="text-sm text-zinc-500 font-normal ml-2">
              {allMedia.length} {allMedia.length === 1 ? "imagem" : "imagens"}
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allMedia.slice(0, 9).map((img, i) => (
              <img
                key={img.image_id}
                src={`https:${img.url}`}
                alt=""
                onClick={() => onOpenLightbox(allMedia, i)}
                className="rounded-lg w-full object-cover aspect-video bg-zinc-800 cursor-pointer hover:brightness-75 transition-all"
              />
            ))}
          </div>
          {allMedia.length > 9 && (
            <button
              onClick={() => onOpenLightbox(allMedia, 9)}
              className="mt-3 cursor-pointer text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Ver todas ({allMedia.length})
            </button>
          )}
        </div>
      )}

      <hr className="my-6 border-zinc-700" />

      <GameReviews gameId={game.id} />
    </div>
  )
}