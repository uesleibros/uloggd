import { Languages, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import QuickActions from "@components/Game/QuickActions"
import ReviewButton from "@components/Game/Review"
import JournalButton from "@components/Game/Journal"
import GameReviews from "@components/Game/GameReviews"
import { GameSteamAchievements } from "@components/Game/SteamAchievements"
import { GameRetroAchievements } from "@components/Game/RetroAchievements"
import { GamePSNTrophies } from "@components/Game/PSNTrophies"
import { StatCard } from "../components/StatCard"
import { InfoRow } from "../components/InfoRow"
import { HowLongToBeat } from "../components/HowLongToBeat"
import { GameHeader } from "./GameHeader"
import PriceHistory from "@components/Game/PriceHistory"
import CommentSection from "@components/UI/CommentSection"
import Translatable from "@components/UI/Translatable"

export function GameContent({ game, hltb, hltbLoading, onOpenLightbox }) {
  const { t } = useTranslation("game")

  const allMedia = [...(game.screenshots || []), ...(game.artworks || [])]

  return (
    <div className="flex-1 min-w-0">
      <GameHeader game={game} />

      <div className="hidden md:block">
        <QuickActions game={game} />
        <ReviewButton game={game} />
      </div>

      <div className="hidden mt-2 mb-6 md:block">
        <JournalButton game={game} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={game.total_rating_count} label={t("content.stats.ratings")} />
        <StatCard value={game.hypes} label={t("content.stats.hype")} />
        <StatCard value={game.platforms?.length} label={t("content.stats.platforms")} />
      </div>

      {game.summary && (
        <div>
          <hr className="my-6 border-zinc-700" />
          <h2 className="text-lg font-semibold text-white mb-2">{t("content.about")}</h2>
          <Translatable className="text-sm text-zinc-400 leading-relaxed" truncate={500}>
            {game.summary}
          </Translatable>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <InfoRow label={t("content.info.developer")}>
          {game.developers?.join(", ")}
        </InfoRow>
        <InfoRow label={t("content.info.publisher")}>
          {game.publishers?.join(", ")}
        </InfoRow>
        <InfoRow label={t("content.info.genres")}>
          {game.genres?.map((g) => g.name).join(", ")}
        </InfoRow>
        <InfoRow label={t("content.info.themes")}>
          {game.themes?.map((th) => th.name).join(", ")}
        </InfoRow>
        <InfoRow label={t("content.info.modes")}>
          {game.game_modes?.map((m) => m.name).join(", ")}
        </InfoRow>
        <InfoRow label={t("content.info.engine")}>
          {game.game_engines?.map((e) => e.name).join(", ")}
        </InfoRow>
      </div>

      <HowLongToBeat hltb={hltb} loading={hltbLoading} />

      {game.steamId && (
        <>
          <PriceHistory steamId={game.steamId} />
          <GameSteamAchievements appId={game.steamId} />
        </>
      )}

      <GamePSNTrophies gameName={game.name} />
      <GameRetroAchievements gameName={game.name} />

      {allMedia.length > 0 && (
        <div>
          <hr className="my-6 border-zinc-700" />
          <h2 className="text-lg font-semibold text-white mb-4">
            {t("content.media.title")}
            <span className="text-sm text-zinc-500 font-normal ml-2">
              {t("content.media.image", { count: allMedia.length })}
            </span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allMedia.slice(0, 9).map((img, i) => (
              <img
                key={img.image_id}
                src={img.url}
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
              {t("content.media.viewAll", { count: allMedia.length })}
            </button>
          )}
        </div>
      )}

      <hr className="my-6 border-zinc-700" />

      <GameReviews gameId={game.id} />
    </div>
  )
}
