import { useTranslation } from "#hooks/useTranslation"
import QuickActions from "@components/Game/QuickActions"
import ReviewButton from "@components/Game/Review"
import JournalButton from "@components/Game/Journal"
import GameReviews from "@components/Game/GameReviews"
import { GameSteamAchievements } from "@components/Game/SteamAchievements"
import { GameRetroAchievements } from "@components/Game/RetroAchievements"
import { GamePSNTrophies } from "@components/Game/PSNTrophies"
import GameEvents from "../components/GameEvents"
import { StatCard } from "../components/StatCard"
import { InfoRow } from "../components/InfoRow"
import { HowLongToBeat } from "../components/HowLongToBeat"
import { GameHeader } from "./GameHeader"
import PriceHistory from "@components/Game/PriceHistory"
import Translatable from "@components/UI/Translatable"

function SectionTitle({ children, count, icon: Icon }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
      )}
      <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
        {children}
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-xs font-medium text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </h2>
    </div>
  )
}

function SectionBlock({ children, className = "" }) {
  return (
    <div className={`py-6 sm:py-8 border-t border-zinc-800/80 first:border-t-0 first:pt-0 ${className}`}>
      {children}
    </div>
  )
}

export function GameContent({ game, hltb, hltbLoading, onOpenLightbox }) {
  const { t } = useTranslation("game")

  const allMedia = [...(game.screenshots || []), ...(game.artworks || [])]
  const hasInfo =
    game.developers?.length ||
    game.publishers?.length ||
    game.genres?.length ||
    game.themes?.length ||
    game.game_modes?.length ||
    game.game_engines?.length

  const hasStats = game.total_rating_count || game.hypes || game.platforms?.length

  return (
    <div className="space-y-0">
      <GameHeader game={game} />

      <div className="hidden lg:flex items-center gap-3 mt-6 mb-2">
        <div className="flex-1">
          <QuickActions game={game} />
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3 mb-2">
        <ReviewButton game={game} />
      </div>

      <div className="hidden lg:block mb-6">
        <JournalButton game={game} />
      </div>

      {hasStats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <StatCard value={game.total_rating_count} label={t("content.stats.ratings")} />
          <StatCard value={game.hypes} label={t("content.stats.hype")} />
          <StatCard value={game.platforms?.length} label={t("content.stats.platforms")} />
        </div>
      )}

      <GameEvents events={game.events} />

      {game.summary && (
        <SectionBlock>
          <SectionTitle>{t("content.about")}</SectionTitle>
          <div className="mt-4">
            <Translatable className="text-sm text-zinc-400 leading-[1.8]" truncate={500}>
              {game.summary}
            </Translatable>
          </div>
        </SectionBlock>
      )}

      {hasInfo && (
        <SectionBlock>
          <SectionTitle>{t("content.info.title")}</SectionTitle>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {game.developers?.length > 0 && (
              <InfoRow label={t("content.info.developer")}>
                {game.developers.join(", ")}
              </InfoRow>
            )}
            {game.publishers?.length > 0 && (
              <InfoRow label={t("content.info.publisher")}>
                {game.publishers.join(", ")}
              </InfoRow>
            )}
            {game.genres?.length > 0 && (
              <InfoRow label={t("content.info.genres")}>
                {game.genres.map((g) => g.name).join(", ")}
              </InfoRow>
            )}
            {game.themes?.length > 0 && (
              <InfoRow label={t("content.info.themes")}>
                {game.themes.map((th) => th.name).join(", ")}
              </InfoRow>
            )}
            {game.game_modes?.length > 0 && (
              <InfoRow label={t("content.info.modes")}>
                {game.game_modes.map((m) => m.name).join(", ")}
              </InfoRow>
            )}
            {game.game_engines?.length > 0 && (
              <InfoRow label={t("content.info.engine")}>
                {game.game_engines.map((e) => e.name).join(", ")}
              </InfoRow>
            )}
          </div>
        </SectionBlock>
      )}

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
        <SectionBlock>
          <SectionTitle count={allMedia.length}>{t("content.media.title")}</SectionTitle>
          <div className="mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {allMedia.slice(0, 9).map((img, i) => {
                const isLast = i === 8 && allMedia.length > 9
                return (
                  <div
                    key={img.image_id}
                    className="relative group cursor-pointer"
                    onClick={() => onOpenLightbox(allMedia, i)}
                  >
                    <img
                      src={img.url}
                      alt=""
                      loading="lazy"
                      className="rounded-xl w-full object-cover aspect-video bg-zinc-800/80 group-hover:brightness-[0.6] transition-all duration-300"
                    />
                    <div className="absolute inset-0 rounded-xl border border-white/[0.04] group-hover:border-white/10 transition-colors duration-300" />
                    {isLast && (
                      <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="text-white font-semibold text-lg">
                          +{allMedia.length - 9}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </SectionBlock>
      )}

      <SectionBlock>
        <GameReviews gameId={game.id} />
      </SectionBlock>
    </div>
  )
}
