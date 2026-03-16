import { useState, useEffect } from "react"
import { Trophy, ExternalLink, ChevronDown, ChevronUp, Users, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import Modal from "@components/UI/Modal"

const RA_ICON = "https://static.retroachievements.org/assets/images/ra-icon.webp"

function RAIcon({ className }) {
  return <img src={RA_ICON} alt="" draggable={false} className={`object-contain ${className}`} />
}

function AchievementDetailModal({ achievement, gameName, raGameId, isOpen, onClose }) {
  const { t } = useTranslation("game")

  if (!achievement) return null

  const rarity = achievement.numAwarded > 0 && achievement.totalPlayers > 0
    ? Math.round((achievement.numAwarded / achievement.totalPlayers) * 100)
    : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <img
            src={achievement.earned ? achievement.badgeUrl : achievement.badgeLockedUrl}
            alt={achievement.title}
            className={`w-16 h-16 rounded-lg border border-zinc-700 flex-shrink-0 bg-zinc-800 ${
              !achievement.earned ? "grayscale opacity-60" : ""
            }`}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white break-words">{achievement.title}</h3>
            {achievement.description && (
              <p className="text-sm text-zinc-400 mt-1 break-words">{achievement.description}</p>
            )}
          </div>
        </div>

        <div className="mt-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("content.ra.detail.status")}</span>
            <span className={`text-xs font-medium ${achievement.earned ? "text-green-400" : "text-zinc-500"}`}>
              {achievement.earned ? t("content.ra.detail.unlocked") : t("content.ra.detail.locked")}
            </span>
          </div>
          {achievement.earned && achievement.earnedDate && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("content.ra.detail.unlockedAt")}</span>
              <span className="text-xs text-white">{new Date(achievement.earnedDate).toLocaleDateString()}</span>
            </div>
          )}
          {achievement.hardcoreEarned && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("content.ra.detail.mode")}</span>
              <span className="text-xs text-yellow-400 font-medium">Hardcore</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("content.ra.detail.points")}</span>
            <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {achievement.points}
            </span>
          </div>
          {rarity !== null && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("content.ra.detail.rarity")}</span>
              <span className={`text-xs font-medium ${
                rarity < 5 ? "text-yellow-400" :
                rarity < 20 ? "text-purple-400" :
                rarity < 50 ? "text-blue-400" : "text-zinc-400"
              }`}>
                {rarity}%
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("content.ra.detail.platform")}</span>
            <div className="flex items-center gap-1.5">
              <RAIcon className="w-3.5 h-3.5" />
              <span className="text-xs text-yellow-400">RetroAchievements</span>
            </div>
          </div>
        </div>

        <a
          href={`https://retroachievements.org/game/${raGameId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <RAIcon className="w-4 h-4" />
          {t("content.ra.viewOnRA")}
        </a>
      </div>
    </Modal>
  )
}

export function GameRetroAchievements({ gameName }) {
  const { t } = useTranslation("game")
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!user?.user_id || !gameName) {
      setLoading(false)
      return
    }

    setLoading(true)
    setData(null)
    setSelected(null)
    setFilter("all")
    setShowAll(false)

    fetch(`/api/retroachievements/game?gameName=${encodeURIComponent(gameName)}&userId=${user.user_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [user?.user_id, gameName])

  if (!user) return null

  if (loading) {
    return (
      <>
        <hr className="my-6 border-zinc-700" />
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-zinc-600" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("content.ra.title")}
            </span>
            <RAIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (!data?.connected || !data?.found || !data?.achievements?.length) return null

  const { match, progress, achievements, game } = data

  const filtered = achievements.filter(a => {
    if (filter === "unlocked") return a.earned
    if (filter === "locked") return !a.earned
    return true
  })

  const visible = showAll ? filtered : filtered.slice(0, 12)
  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0)
  const earnedPoints = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.points, 0)

  const enrichedSelected = selected ? {
    ...selected,
    totalPlayers: game?.numPlayers || 0,
  } : null

  return (
    <>
      <hr className="my-6 border-zinc-700" />
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-zinc-600" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("content.ra.title")}
            </span>
            <RAIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {progress.earned}/{progress.totalAchievements} ({progress.percentage}%)
            </span>
            <a
              href={`https://retroachievements.org/game/${match.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-600 hover:text-yellow-400 transition-colors flex items-center gap-1"
            >
              <span className="hidden sm:inline">{match.consoleName}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {match.title !== gameName && match.score < 1 && (
          <p className="text-[11px] text-zinc-600 mb-3">
            {t("content.ra.matchedAs", { title: match.title })}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {["all", "unlocked", "locked"].map(f => {
              const count = f === "all" ? achievements.length
                : f === "unlocked" ? progress.earned
                : achievements.length - progress.earned

              return (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setShowAll(false) }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    filter === f
                      ? "bg-zinc-700 text-white"
                      : "bg-zinc-800/50 text-zinc-500 hover:text-white"
                  }`}
                >
                  {t(`content.ra.filter.${f}`, { count })}
                </button>
              )
            })}
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-500" />
              {earnedPoints}/{totalPoints}
            </span>
            {game?.numPlayers > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {game.numPlayers.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
          {visible.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-yellow-500/50 transition-all hover:scale-105 cursor-pointer ${
                !a.earned ? "grayscale opacity-60" : ""
              }`}
            >
              <img
                src={a.earned ? a.badgeUrl : a.badgeLockedUrl}
                alt={a.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {a.hardcoreEarned && (
                <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-[6px] font-bold text-black">H</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {filtered.length > 12 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {showAll
              ? t("content.ra.showLess")
              : t("content.ra.showAll", { count: filtered.length })
            }
          </button>
        )}

        <AchievementDetailModal
          achievement={enrichedSelected}
          gameName={game?.title || match.title}
          raGameId={match.id}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
        />
      </div>
    </>
  )
}
