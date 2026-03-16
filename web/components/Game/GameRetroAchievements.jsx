import { useState, useEffect } from "react"
import { Trophy, Lock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"

const RA_ICON = "https://static.retroachievements.org/assets/images/ra-icon.webp"

function AchievementItem({ achievement }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
      achievement.earned ? "bg-yellow-500/5" : "bg-zinc-800/30 opacity-60"
    }`}>
      <img
        src={achievement.earned ? achievement.badgeUrl : achievement.badgeLockedUrl}
        alt=""
        className="w-10 h-10 rounded-lg flex-shrink-0 bg-zinc-800"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${achievement.earned ? "text-white" : "text-zinc-500"}`}>
            {achievement.title}
          </span>
          {achievement.hardcoreEarned && (
            <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-full font-medium">
              HC
            </span>
          )}
          <span className="text-xs text-yellow-500 flex items-center gap-0.5 ml-auto flex-shrink-0">
            <Trophy className="w-3 h-3" />
            {achievement.points}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{achievement.description}</p>
        {achievement.earned && achievement.earnedDate && (
          <p className="text-[11px] text-zinc-600 mt-1">
            {new Date(achievement.earnedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ percentage, hardcorePercentage }) {
  return (
    <div className="w-full">
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-zinc-500">{percentage}%</span>
        {hardcorePercentage > 0 && (
          <span className="text-[11px] text-yellow-500">
            {hardcorePercentage}% hardcore
          </span>
        )}
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

  if (loading || !data?.connected || !data?.found || !data?.progress) return null

  const { game, progress, achievements, match } = data
  const displayedAchievements = expanded ? achievements : achievements.slice(0, 6)

  return (
    <div>
      <hr className="my-6 border-zinc-700" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <img src={RA_ICON} alt="" className="w-5 h-5 object-contain" />
          <h2 className="text-lg font-semibold text-white">RetroAchievements</h2>
          <span className="text-sm text-zinc-500">
            ({progress.earned}/{progress.totalAchievements})
          </span>
        </div>

        <a
          href={`https://retroachievements.org/game/${match.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-yellow-400 transition-colors"
        >
          {match.consoleName}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {match.title !== gameName && (
        <p className="text-xs text-zinc-600 mb-3">
          {t("content.ra.matchedAs", { title: match.title })}
        </p>
      )}

      <ProgressBar
        percentage={progress.percentage}
        hardcorePercentage={progress.hardcorePercentage}
      />

      <div className="mt-4 space-y-1.5">
        {displayedAchievements.map(a => (
          <AchievementItem key={a.id} achievement={a} />
        ))}
      </div>

      {achievements.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer"
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
