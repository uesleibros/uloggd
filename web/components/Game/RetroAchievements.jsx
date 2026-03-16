import { useState, useEffect } from "react"
import { Trophy, ExternalLink, ChevronDown, ChevronUp, Users } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"

const RA_ICON = "https://static.retroachievements.org/assets/images/ra-icon.webp"

function AchievementItem({ achievement, totalPlayers }) {
  const rarity = totalPlayers > 0
    ? Math.round((achievement.numAwarded / totalPlayers) * 100)
    : null

  return (
    <div className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg transition-colors ${
      achievement.earned ? "bg-yellow-500/5" : "bg-zinc-800/30"
    }`}>
      <img
        src={achievement.earned ? achievement.badgeUrl : achievement.badgeLockedUrl}
        alt=""
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 bg-zinc-800 ${
          !achievement.earned ? "opacity-40 grayscale" : ""
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs sm:text-sm font-medium leading-tight ${
                achievement.earned ? "text-white" : "text-zinc-500"
              }`}>
                {achievement.title}
              </span>
              {achievement.hardcoreEarned && (
                <span className="text-[9px] sm:text-[10px] text-yellow-400 bg-yellow-500/15 px-1 sm:px-1.5 py-0.5 rounded font-bold">
                  HC
                </span>
              )}
            </div>
            <p className={`text-[11px] sm:text-xs mt-0.5 line-clamp-2 ${
              achievement.earned ? "text-zinc-400" : "text-zinc-600"
            }`}>
              {achievement.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-[11px] sm:text-xs text-yellow-500 flex items-center gap-0.5 font-medium">
              <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              {achievement.points}
            </span>
            {rarity !== null && (
              <span className="text-[10px] text-zinc-600">
                {rarity}%
              </span>
            )}
          </div>
        </div>
        {achievement.earned && achievement.earnedDate && (
          <p className="text-[10px] sm:text-[11px] text-zinc-600 mt-1">
            {new Date(achievement.earnedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ progress }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs sm:text-sm text-zinc-300 font-medium">
          {progress.earned}/{progress.totalAchievements}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-yellow-400 font-medium">{progress.percentage}%</span>
          {progress.hardcorePercentage > 0 && (
            <span className="text-[10px] sm:text-[11px] text-yellow-500/70 bg-yellow-500/10 px-1.5 py-0.5 rounded font-medium">
              {progress.hardcorePercentage}% HC
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 sm:h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  )
}

function AchievementsSkeleton() {
  return (
    <div>
      <hr className="my-6 border-zinc-700" />
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-zinc-800 rounded" />
          <div className="h-5 w-40 bg-zinc-800 rounded" />
        </div>
        <div className="h-2 bg-zinc-800 rounded-full" />
        <div className="space-y-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-zinc-800 rounded" />
                <div className="h-3 w-full bg-zinc-800/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GameRetroAchievements({ gameName }) {
  const { t } = useTranslation("game")
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!user?.user_id || !gameName) {
      setLoading(false)
      return
    }

    fetch(`/api/retroachievements/game?gameName=${encodeURIComponent(gameName)}&userId=${user.user_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [user?.user_id, gameName])

  if (!user) return null
  if (loading) return <AchievementsSkeleton />
  if (!data?.connected || !data?.found || !data?.achievements?.length) return null

  const { match, progress, achievements, game } = data
  const displayedAchievements = expanded ? achievements : achievements.slice(0, 6)
  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0)
  const earnedPoints = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.points, 0)

  return (
    <div>
      <hr className="my-6 border-zinc-700" />

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <img src={RA_ICON} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-white truncate">RetroAchievements</h2>
          <span className="text-xs sm:text-sm text-zinc-500 flex-shrink-0">
            ({progress.earned}/{progress.totalAchievements})
          </span>
        </div>

        <a
          href={`https://retroachievements.org/game/${match.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] sm:text-xs text-zinc-500 hover:text-yellow-400 transition-colors flex-shrink-0"
        >
          <span className="hidden sm:inline">{match.consoleName}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {match.title !== gameName && match.score < 1 && (
        <p className="text-[11px] sm:text-xs text-zinc-600 mb-3">
          {t("content.ra.matchedAs", { title: match.title })}
        </p>
      )}

      <div className="mb-4">
        <ProgressBar progress={progress} />
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500" />
          {earnedPoints}/{totalPoints} pts
        </span>
        {game?.numPlayers > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {game.numPlayers.toLocaleString()}
          </span>
        )}
      </div>

      <div className="space-y-1 sm:space-y-1.5">
        {displayedAchievements.map(a => (
          <AchievementItem
            key={a.id}
            achievement={a}
            totalPlayers={game?.numPlayers || 0}
          />
        ))}
      </div>

      {achievements.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 mt-3 py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              {t("content.ra.showLess")}
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {t("content.ra.showAll", { count: achievements.length })}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
