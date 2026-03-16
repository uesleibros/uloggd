import { useState, useEffect } from "react"
import { Trophy, EyeOff, Eye, Loader2, ChevronRight } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { SteamIcon } from "#constants/customIcons"
import { getTimeAgoFromTimestamp } from "#utils/formatDate"

function AchievementGrid({ achievements, onSelect, showLockState = false, columns = "grid-cols-6 sm:grid-cols-8" }) {
  return (
    <div className={`grid ${columns} gap-1.5 sm:gap-2`}>
      {achievements.map((achievement, i) => {
        const isHidden = achievement.hidden && !achievement.achieved
        const isLocked = showLockState && !achievement.achieved

        return (
          <button
            key={`${achievement.name || achievement.appId}-${i}`}
            onClick={() => onSelect(achievement)}
            className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border transition-all hover:scale-105 cursor-pointer ${
              isLocked
                ? "border-zinc-700/50 grayscale opacity-50 hover:opacity-70"
                : "border-zinc-700/50 hover:border-zinc-500"
            }`}
          >
            <img
              src={showLockState
                ? (achievement.achieved ? achievement.iconUnlocked : achievement.iconLocked)
                : (achievement.icon || achievement.iconUnlocked)
              }
              alt=""
              className={`w-full h-full object-cover ${isHidden ? "blur-sm" : ""}`}
              loading="lazy"
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <EyeOff className="w-3 h-3 text-zinc-400" />
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

function AchievementModal({ achievement, isOpen, onClose, onViewGame, gameName, appId, showGame = true }) {
  const { t } = useTranslation("achievements")
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!achievement) return null

  const resolvedAppId = appId || achievement.appId
  const resolvedGameName = gameName || achievement.game
  const isHidden = achievement.hidden && !achievement.achieved && !revealed
  const isRecent = !!achievement.unlockedAt && !gameName

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={achievement.iconUnlocked || achievement.icon}
              alt=""
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-zinc-700 bg-zinc-800 ${
                isHidden ? "blur-md" : ""
              } ${!achievement.achieved ? "grayscale opacity-60" : ""}`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-sm sm:text-base font-bold text-white break-words">
              {isHidden ? t("detail.hiddenTitle") : achievement.name}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 break-words">
              {isHidden ? t("detail.hiddenDescription") : achievement.description}
            </p>
          </div>
        </div>

        {achievement.hidden && !achievement.achieved && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="flex items-center gap-2 w-full py-2.5 px-3 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-sm text-yellow-400 transition-colors cursor-pointer"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {revealed ? t("detail.hideDetails") : t("detail.revealWarning")}
          </button>
        )}

        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 divide-y divide-zinc-700/50">
          {showGame && resolvedGameName && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.game")}</span>
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${resolvedAppId}/header.jpg`}
                  alt=""
                  className="w-8 h-4 object-cover rounded flex-shrink-0"
                />
                <span className="text-xs text-white font-medium truncate">{resolvedGameName}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-zinc-500">{t("detail.status")}</span>
            <span className={`text-xs font-medium ${achievement.achieved ? "text-green-400" : "text-zinc-500"}`}>
              {achievement.achieved ? t("detail.unlocked") : t("detail.locked")}
            </span>
          </div>

          {achievement.achieved && achievement.unlockedAt && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.unlockedAt")}</span>
              <span className="text-xs text-white">{getTimeAgoFromTimestamp(achievement.unlockedAt)}</span>
            </div>
          )}

          {achievement.globalPercent !== undefined && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.rarity")}</span>
              <span className={`text-xs font-medium ${
                achievement.globalPercent < 5 ? "text-yellow-400" :
                achievement.globalPercent < 20 ? "text-purple-400" :
                achievement.globalPercent < 50 ? "text-blue-400" : "text-zinc-400"
              }`}>
                {achievement.globalPercent.toFixed(1)}%
              </span>
            </div>
          )}

          {achievement.hidden && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.type")}</span>
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                {t("detail.secret")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-zinc-500">{t("detail.platform")}</span>
            <div className="flex items-center gap-1.5">
              <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
              <span className="text-xs text-[#66c0f4]">Steam</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {isRecent && onViewGame && (
            <button
              onClick={onViewGame}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#66c0f4]/10 hover:bg-[#66c0f4]/20 border border-[#66c0f4]/30 rounded-xl text-sm text-[#66c0f4] transition-colors cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              {t("detail.viewAllInGame")}
            </button>
          )}

          <a
            href={`https://store.steampowered.com/app/${resolvedAppId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:text-white transition-colors"
          >
            <SteamIcon className="w-4 h-4" />
            {t("detail.viewOnSteam")}
          </a>
        </div>
      </div>
    </Modal>
  )
}

function GameAchievementsModal({ game, userId, isOpen, onClose }) {
  const { t } = useTranslation("achievements")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    if (!isOpen || !game) return

    setLoading(true)
    setData(null)
    setSelected(null)
    setFilter("all")

    const params = new URLSearchParams({ appId: game.appId })
    if (userId) params.append("userId", userId)

    fetch(`/api/steam/gameAchievements?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, game, userId])

  if (!game) return null

  if (selected) {
    return (
      <AchievementModal
        achievement={selected}
        gameName={data?.gameName || game.game}
        appId={game.appId}
        isOpen={isOpen}
        onClose={() => { setSelected(null); onClose() }}
        showGame={false}
      />
    )
  }

  const hasProgress = data && !data.notConnected
  const filtered = data?.achievements?.filter(a => {
    if (filter === "unlocked") return a.achieved
    if (filter === "locked") return !a.achieved
    return true
  }) || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" fullscreenMobile showMobileGrip noScroll>
      <div className="flex flex-col h-full">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={game.banner}
              alt=""
              className="w-16 sm:w-20 h-8 sm:h-10 object-cover rounded-lg border border-zinc-700 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">{game.game}</h3>
              {hasProgress && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs text-zinc-400 flex-shrink-0">
                    {data.unlocked}/{data.total}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : !data?.achievements?.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Trophy className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">{t("gameModal.noAchievements")}</p>
            </div>
          ) : (
            <>
              <FilterTabs
                filter={filter}
                onFilter={setFilter}
                counts={{
                  all: data.total,
                  unlocked: data.unlocked || 0,
                  locked: data.total - (data.unlocked || 0),
                }}
              />

              <div className="space-y-1.5">
                {filtered.map((achievement, i) => {
                  const isHidden = achievement.hidden && !achievement.achieved

                  return (
                    <button
                      key={`${achievement.name}-${i}`}
                      onClick={() => setSelected(achievement)}
                      className="w-full flex items-center gap-3 p-2.5 sm:p-3 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 rounded-xl transition-all cursor-pointer text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={achievement.achieved ? achievement.iconUnlocked : achievement.iconLocked}
                          alt=""
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-800 ${
                            isHidden ? "blur-sm" : ""
                          } ${!achievement.achieved ? "grayscale opacity-50" : ""}`}
                        />
                        {isHidden && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <EyeOff className="w-3 h-3 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs sm:text-sm font-medium truncate ${
                            achievement.achieved ? "text-white" : "text-zinc-500"
                          }`}>
                            {isHidden ? t("detail.hiddenTitle") : achievement.name}
                          </span>
                          {achievement.hidden && (
                            <EyeOff className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {achievement.globalPercent !== undefined && (
                            <span className={`text-[11px] sm:text-xs ${
                              achievement.globalPercent < 5 ? "text-yellow-400" :
                              achievement.globalPercent < 20 ? "text-purple-400" :
                              achievement.globalPercent < 50 ? "text-blue-400" : "text-zinc-600"
                            }`}>
                              {achievement.globalPercent.toFixed(1)}%
                            </span>
                          )}
                          {achievement.achieved && (
                            <span className="text-[11px] sm:text-xs text-green-400">✓</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-zinc-800 flex-shrink-0">
          <a
            href={`https://store.steampowered.com/app/${game.appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:text-white transition-colors"
          >
            <SteamIcon className="w-4 h-4" />
            {t("detail.viewOnSteam")}
          </a>
        </div>
      </div>
    </Modal>
  )
}

export default function SteamAchievements({ userId }) {
  const { t } = useTranslation("achievements")
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState(null)
  const [gameModal, setGameModal] = useState(null)

  useEffect(() => {
    setAchievements([])
    setLoading(true)
    setShowAll(false)
    setSelected(null)
    setGameModal(null)

    if (!userId) return

    fetch(`/api/steam/achievements?userId=${userId}`)
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
            {t("profile.title")}
          </span>
          <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
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
        isOpen={!!selected && !gameModal}
        onClose={() => setSelected(null)}
        onViewGame={() => {
          if (selected) {
            setGameModal({
              appId: selected.appId,
              game: selected.game,
              banner: `https://cdn.cloudflare.steamstatic.com/steam/apps/${selected.appId}/header.jpg`,
            })
          }
        }}
      />

      <GameAchievementsModal
        game={gameModal}
        userId={userId}
        isOpen={!!gameModal}
        onClose={() => { setGameModal(null); setSelected(null) }}
      />
    </div>
  )
}

export function GameSteamAchievements({ appId }) {
  const { t } = useTranslation("achievements")
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!appId) return

    setLoading(true)
    setData(null)
    setSelected(null)
    setFilter("all")
    setShowAll(false)

    const params = new URLSearchParams({ appId })
    if (user?.user_id) params.set("userId", user.user_id)

    fetch(`/api/steam/gameAchievements?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [appId, user?.user_id])

  if (loading) {
    return (
      <>
        <hr className="my-6 border-zinc-700" />
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-zinc-600" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("game.title")}
            </span>
            <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
          </div>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (!data || data.total === 0) return null

  const hasProgress = !data.notConnected
  const unlockedCount = data.unlocked || 0
  const lockedCount = data.total - unlockedCount

  const filtered = data.achievements.filter(a => {
    if (filter === "unlocked") return a.achieved
    if (filter === "locked") return !a.achieved
    return true
  })

  const visible = showAll ? filtered : filtered.slice(0, 18)

  return (
    <>
      <hr className="my-6 border-zinc-700" />
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex-shrink-0">
              {t("game.title")}
            </span>
            <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4] flex-shrink-0" />
          </div>
          {hasProgress && (
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {unlockedCount}/{data.total} ({data.percentage}%)
            </span>
          )}
        </div>

        {data.notConnected && (
          <div className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg mb-4">
            <SteamIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <span className="text-xs text-zinc-400">{t("game.connectSteam")}</span>
          </div>
        )}

        {hasProgress && (
          <div className="mb-4">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${data.percentage}%` }}
              />
            </div>
          </div>
        )}

        <FilterTabs
          filter={filter}
          onFilter={(f) => { setFilter(f); setShowAll(false) }}
          counts={{ all: data.total, unlocked: unlockedCount, locked: lockedCount }}
        />

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
          gameName={data.gameName}
          appId={appId}
          showGame={false}
        />
      </div>
    </>
  )
}
