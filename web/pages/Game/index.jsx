import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "#hooks/usePageMeta"
import PageBanner from "@components/Layout/PageBanner"
import Lightbox from "@components/UI/Lightbox"
import QuickActions from "@components/Game/QuickActions"
import ReviewButton from "@components/Game/ReviewButton"
import { GameSkeleton } from "./GameSkeleton"
import { GameHeader } from "./sections/GameHeader"
import { GameSidebar } from "./sections/GameSidebar"
import { GameContent } from "./sections/GameContent"
import { RelatedGamesSection } from "./sections/RelatedGames"
import { useGameData } from "./hooks/useGameData"

export default function Game() {
  const { slug } = useParams()
  const { game, hltb, hltbLoading, loading, error } = useGameData(slug)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [lightboxImages, setLightboxImages] = useState([])

  usePageMeta(
    game
      ? {
          title: `${game.name} - uloggd`,
          description: game.summary || `Veja informações sobre ${game.name} no uloggd`,
          image: game.cover?.url ? `https:${game.cover.url}` : undefined,
        }
      : undefined
  )

  function openLightbox(images, index) {
    setLightboxImages(images)
    setLightboxIndex(index)
  }

  if (loading) return <GameSkeleton />

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <h1 className="text-2xl font-bold text-white">Jogo não encontrado</h1>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Voltar ao início
        </Link>
      </div>
    )
  }

  const bannerImage =
    game.screenshots?.length > 0 ? `https:${game.screenshots[0].url}` : null

  return (
    <div>
      <PageBanner image={bannerImage} height="game" />
      <div className="mx-auto pt-[22vw] sm:pt-[20vw] md:pt-32 pb-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <GameSidebar game={game} />

          <div className="flex flex-row md:hidden gap-4">
            <div className="flex-shrink-0">
              {game.cover && (
                <img
                  src={`https:${game.cover.url}`}
                  alt={game.name}
                  className="w-32 sm:w-48 rounded-lg shadow-2xl bg-zinc-800 select-none"
                />
              )}
            </div>
            <GameHeader game={game} isMobile />
          </div>

          <div className="md:hidden">
            <QuickActions game={game} />
            <ReviewButton game={game} />
          </div>

          <GameContent
            game={game}
            hltb={hltb}
            hltbLoading={hltbLoading}
            onOpenLightbox={openLightbox}
          />
        </div>
        <RelatedGamesSection game={game} />
      </div>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onPrev={() =>
          setLightboxIndex((i) => (i > 0 ? i - 1 : lightboxImages.length - 1))
        }
        onNext={() =>
          setLightboxIndex((i) => (i < lightboxImages.length - 1 ? i + 1 : 0))
        }
      />
    </div>
  )
}