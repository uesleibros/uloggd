import { useState, useEffect } from "react"
import { Trophy, ExternalLink, Users, Loader2, ChevronRight } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

const RA_ICON = "https://static.retroachievements.org/assets/images/ra-icon.webp"

function RAIcon({ className }) {
  return <img src={RA_ICON} alt="" draggable={false} className={`object-contain ${className}`} />
}

function AchievementGrid({ achievements, onSelect, showLockState = false, columns = "grid-cols-6 sm:grid-cols-8" }) {
  return (
    <div className={`grid ${columns} gap-1.5 sm:gap-2`}>
      {achievements.map((a) => {
        const isLocked = showLockState && !a.earned

        return (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border transition-all hover:scale-105 cursor-pointer ${
              isLocked
                ? "border-zinc-700/50 grayscale opacity-50 hover:opacity-70"
                : "border-zinc-700/50 hover:border-yellow-500/50"
            }`}
          >
            <img
              src={a.earned ? a.badgeUrl : (a.badgeLockedUrl || a.badgeUrl)}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {a.hardcoreEarned && (
              <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-[6px] font-bold text-black">H</span>
              </div>
            )}
            {a.hardcoreMode && (
              <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-[6px] font-bold text-black">H</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function FilterTabs({ filter, onFilter, counts }) {
  const { t } = useTranslation("achievements")

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto scrollbar-hide">
      {["all", "unlocked", "locked"].map(f => (
        <button
          key={f}
          onClick={() => onFilter(f)}
          className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
            filter === f
              ? "bg-zinc-700 text-white"
              : "bg-zinc-800/50 text-zinc-500 hover:text-white"
          }`}
        >
          {t(`common.filter.${f}`)} ({counts[f]})
        </button>
      ))}
    </div>
  )
}

function AchievementModal({ achievement, isOpen, onClose, gameName, raGameId, consoleName, totalPlayers, showGame = true }) {
  const { t } = useTranslation("achievements")

  if (!achievement) return null

  const rarity = achievement.numAwarded > 0 && totalPlayers > 0
    ? Math.round((achievement.numAwarded / totalPlayers) * 100)
    : null

  const earnedDate = achievement.earnedDate || achievement.Date

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <img
            src={achievement.earned !== false ? achievement.badgeUrl : (achievement.badgeLockedUrl || achievement.badgeUrl)}
            alt=""
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-zinc-700 bg-zinc-800 flex-shrink-0 ${
              achievement.earned === false ? "grayscale opacity-60" : ""
            }`}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-sm sm:text-base font-bold text-white break-words">
              {achievement.title}
            </h3>
            {achievement.description && (
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 break-words">
                {achievement.description}
              </p>
            )}
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 divide-y divide-zinc-700/50">
          {showGame && (gameName || achievement.gameTitle) && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.game")}</span>
              <span className="text-xs text-white font-medium truncate">
                {gameName || achievement.gameTitle}
              </span>
            </div>
          )}

          {(consoleName || achievement.consoleName) && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.platform")}</span>
              <div className="flex items-center gap-1.5">
                <RAIcon className="w-3.5 h-3.5" />
                <span className="text-xs text-yellow-400">{consoleName || achievement.consoleName}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-zinc-500">{t("detail.status")}</span>
            <span className={`text-xs font-medium ${achievement.earned !== false ? "text-green-400" : "text-zinc-500"}`}>
              {achievement.earned !== false ? t("detail.unlocked") : t("detail.locked")}
            </span>
          </div>

          {earnedDate && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.unlockedAt")}</span>
              <span className="text-xs text-white">
                {new Date(earnedDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {(achievement.hardcoreEarned || achievement.hardcoreMode) && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.mode")}</span>
              <span className="text-xs text-yellow-400 font-medium">Hardcore</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-zinc-500">{t("detail.points")}</span>
            <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {achievement.points}
            </span>
          </div>

          {rarity !== null && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.rarity")}</span>
              <span className={`text-xs font-medium ${
                rarity < 5 ? "text-yellow-400" :
                rarity < 20 ? "text-purple-400" :
                rarity < 50 ? "text-blue-400" : "text-zinc-400"
              }`}>
                {rarity}%
              </span>
            </div>
          )}
        </div>

        <a
          href={`https://retroachievements.org/game/${raGameId || achievement.gameId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <RAIcon className="w-4 h-4" />
          {t("detail.viewOnRA")}
        </a>
      </div>
    </Modal>
  )
}

export default function ProfileRetroAchievements({ userId }) {
  const { t } = useTranslation("achievements")
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setAchievements([])
    setLoading(true)
    setShowAll(false)
    setSelected(null)

    if (!userId) return

    fetch(`/api/retroachievements/recent?userId=${userId}`)
      .then(r => r.ok ? r.json() : { achievements: [] })
      .then(data => setAchievements(data.achievements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading || achievements.length === 0) return null

  const visible = showAll ? achievements : achievements.slice(0, 12)

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-zinc-600" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("ra.profileTitle")}
          </span>
          <RAIcon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-zinc-600">
          {t("profile.count", { count: achievements.length })}
        </span>
      </div>

      <AchievementGrid
        achievements={visible}
        onSelect={setSelected}
        columns="grid-cols-6 sm:grid-cols-8 md:grid-cols-10"
      />

      {achievements.length > 12 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
        >
          {showAll ? t("common.showLess") : t("common.viewAll", { count: achievements.length })}
          {!showAll && <ChevronRight className="w-3 h-3" />}
        </button>
      )}

      <AchievementModal
        achievement={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        showGame
      />
    </div>
  )
}

export function GameRetroAchievements({ gameName }) {
  const { t } = useTranslation("achievements")
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
              {t("ra.gameTitle")}
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

  const unlockedCount = progress.earned
  const lockedCount = progress.totalAchievements - unlockedCount

  const filtered = achievements.filter(a => {
    if (filter === "unlocked") return a.earned
    if (filter === "locked") return !a.earned
    return true
  })

  const visible = showAll ? filtered : filtered.slice(0, 18)
  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0)
  const earnedPoints = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.points, 0)

  return (
    <>
      <hr className="my-6 border-zinc-700" />
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex-shrink-0">
              {t("ra.gameTitle")}
            </span>
            <RAIcon className="w-3.5 h-3.5 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-zinc-500">
              {unlockedCount}/{progress.totalAchievements} ({progress.percentage}%)
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
            {t("ra.matchedAs", { title: match.title })}
          </p>
        )}

        <div className="mb-4">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 gap-3">
          <FilterTabs
            filter={filter}
            onFilter={(f) => { setFilter(f); setShowAll(false) }}
            counts={{ all: progress.totalAchievements, unlocked: unlockedCount, locked: lockedCount }}
          />
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 flex-shrink-0">
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

        <AchievementGrid
          achievements={visible}
          onSelect={setSelected}
          showLockState
          columns="grid-cols-6 sm:grid-cols-8 md:grid-cols-12"
        />

        {filtered.length > 18 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {showAll ? t("common.showLess") : t("common.viewAll", { count: filtered.length })}
          </button>
        )}

        <AchievementModal
          achievement={selected}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          gameName={game?.title || match.title}
          raGameId={match.id}
          consoleName={match.consoleName}
          totalPlayers={game?.numPlayers || 0}
          showGame={false}
        />
      </div>
    </>
  )
}
