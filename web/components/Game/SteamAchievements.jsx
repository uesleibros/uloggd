import { useState, useEffect } from "react"
import { Trophy, EyeOff, Eye, ChevronLeft, Loader2 } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { SteamIcon } from "#constants/customIcons"
import { getTimeAgoFromTimestamp } from "#utils/formatDate"

function AchievementDetailModal({ achievement, gameName, appId, isOpen, onClose, onBack, showGame = true }) {
  const { t } = useTranslation("achievements.detail")
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!achievement) return null

  const isHidden = achievement.hidden && !achievement.achieved && !revealed

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("back")}
          </button>
        )}

        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={achievement.iconUnlocked || achievement.icon}
              alt={isHidden ? t("hiddenAlt") : achievement.name}
              className={`w-16 h-16 rounded-lg border border-zinc-700 ${isHidden ? "blur-md" : ""} ${!achievement.achieved ? "grayscale opacity-60" : ""}`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white break-words">
              {isHidden ? t("hiddenTitle") : achievement.name}
            </h3>
            {isHidden ? (
              <p className="text-sm text-zinc-500 mt-1">{t("hiddenDescription")}</p>
            ) : (
              achievement.description && (
                <p className="text-sm text-zinc-400 mt-1 break-words">{achievement.description}</p>
              )
            )}
          </div>
        </div>

        {achievement.hidden && !achievement.achieved && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="mt-3 flex items-center gap-2 w-full py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 transition-colors cursor-pointer"
          >
            {revealed ? (
              <>
                <EyeOff className="w-4 h-4 flex-shrink-0" />
                {t("hideDetails")}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 flex-shrink-0" />
                {t("revealWarning")}
              </>
            )}
          </button>
        )}

        <div className="mt-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">
          {showGame && (gameName || achievement.game) && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("game")}</span>
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${appId || achievement.appId}/header.jpg`}
                  alt={gameName || achievement.game}
                  className="w-8 h-4 object-cover rounded flex-shrink-0"
                />
                <span className="text-xs text-white font-medium truncate">{gameName || achievement.game}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("status")}</span>
            <span className={`text-xs font-medium ${achievement.achieved ? "text-green-400" : "text-zinc-500"}`}>
              {achievement.achieved ? t("unlocked") : t("locked")}
            </span>
          </div>
          {achievement.achieved && achievement.unlockedAt && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("unlockedAt")}</span>
              <span className="text-xs text-white truncate">{getTimeAgoFromTimestamp(achievement.unlockedAt)}</span>
            </div>
          )}
          {achievement.globalPercent !== undefined && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("rarity")}</span>
              <span className={`text-xs font-medium ${
                achievement.globalPercent < 5 ? "text-yellow-400" :
                achievement.globalPercent < 20 ? "text-purple-400" :
                achievement.globalPercent < 50 ? "text-blue-400" : "text-zinc-400"
              }`}>
                {t("rarityPercent", { percent: achievement.globalPercent.toFixed(1) })}
              </span>
            </div>
          )}
          {achievement.hidden && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("type")}</span>
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3 flex-shrink-0" />
                {t("secret")}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("platform")}</span>
            <div className="flex items-center gap-1.5">
              <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4] flex-shrink-0" />
              <span className="text-xs text-[#66c0f4]">Steam</span>
            </div>
          </div>
        </div>

        <a
          href={`https://store.steampowered.com/app/${appId || achievement.appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <SteamIcon className="w-4 h-4 flex-shrink-0" />
          {t("viewOnSteam")}
        </a>
      </div>
    </Modal>
  )
}

function GameAchievementsModal({ game, userId, isOpen, onClose }) {
  const { t } = useTranslation("achievements.gameModal")
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

    const fetchAchievements = async () => {
      try {
        const params = new URLSearchParams({ appId: game.appId })
        if (userId) params.append("userId", userId)

        const res = await fetch(`/api/steam/gameAchievements?${params}`)
        const json = await res.json()
        setData(json)
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [isOpen, game, userId])

  if (!game) return null

  if (selected) {
    return (
      <AchievementDetailModal
        achievement={selected}
        gameName={data?.gameName || game.game}
        appId={game.appId}
        isOpen={isOpen}
        onClose={onClose}
        onBack={() => setSelected(null)}
        showGame={false}
      />
    )
  }

  const filtered = data?.achievements?.filter(a => {
    if (filter === "unlocked") return a.achieved
    if (filter === "locked") return !a.achieved
    return true
  }) || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={game.banner}
            alt={game.game}
            className="w-20 h-10 object-cover rounded-lg border border-zinc-700"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white truncate">{game.game}</h3>
            {data && !data.notConnected && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 flex-shrink-0">
                  {data.unlocked}/{data.total} ({data.percentage}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : data?.achievements?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">{t("noAchievements")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              {["all", "unlocked", "locked"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    filter === f
                      ? "bg-zinc-700 text-white"
                      : "bg-zinc-800/50 text-zinc-500 hover:text-white"
                  }`}
                >
                  {t(`filter.${f}`)}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {filtered.map((achievement, i) => {
                const isHidden = achievement.hidden && !achievement.achieved

                return (
                  <button
                    key={`${achievement.name}-${i}`}
                    onClick={() => setSelected(achievement)}
                    className="w-full flex items-center gap-3 p-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all cursor-pointer text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={achievement.achieved ? achievement.iconUnlocked : achievement.iconLocked}
                        alt={isHidden ? t("hiddenAlt") : achievement.name}
                        className={`w-10 h-10 rounded-md ${isHidden ? "blur-sm" : ""} ${!achievement.achieved ? "grayscale opacity-60" : ""}`}
                      />
                      {isHidden && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <EyeOff className="w-3 h-3 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {isHidden ? t("hiddenTitle") : achievement.name}
                        </span>
                        {achievement.hidden && (
                          <EyeOff className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${
                          achievement.globalPercent < 5 ? "text-yellow-400" :
                          achievement.globalPercent < 20 ? "text-purple-400" :
                          achievement.globalPercent < 50 ? "text-blue-400" : "text-zinc-500"
                        }`}>
                          {achievement.globalPercent.toFixed(1)}%
                        </span>
                        {achievement.achieved && (
                          <span className="text-xs text-green-400">✓ {t("unlocked")}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <a
          href={`https://store.steampowered.com/app/${game.appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <SteamIcon className="w-4 h-4 flex-shrink-0" />
          {t("viewOnSteam")}
        </a>
      </div>
    </Modal>
  )
}

function RecentAchievementModal({ achievement, isOpen, onClose, onViewAll }) {
  const { t } = useTranslation("achievements.recent")
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!achievement) return null

  const isHidden = achievement.hidden && !revealed

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={achievement.icon}
              alt={isHidden ? t("hiddenAlt") : achievement.name}
              className={`w-16 h-16 rounded-lg border border-zinc-700 ${isHidden ? "blur-md" : ""}`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white break-words">
              {isHidden ? t("hiddenTitle") : achievement.name}
            </h3>
            {isHidden ? (
              <p className="text-sm text-zinc-500 mt-1">{t("hiddenDescription")}</p>
            ) : (
              achievement.description && (
                <p className="text-sm text-zinc-400 mt-1 break-words">{achievement.description}</p>
              )
            )}
          </div>
        </div>

        {achievement.hidden && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="mt-3 flex items-center gap-2 w-full py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 transition-colors cursor-pointer"
          >
            {revealed ? (
              <>
                <EyeOff className="w-4 h-4 flex-shrink-0" />
                {t("hideDetails")}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 flex-shrink-0" />
                {t("revealWarning")}
              </>
            )}
          </button>
        )}

        <div className="mt-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("game")}</span>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${achievement.appId}/header.jpg`}
                alt={achievement.game}
                className="w-8 h-4 object-cover rounded flex-shrink-0"
              />
              <span className="text-xs text-white font-medium truncate">{achievement.game}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("unlockedAt")}</span>
            <span className="text-xs text-white truncate">{getTimeAgoFromTimestamp(achievement.unlockedAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("platform")}</span>
            <div className="flex items-center gap-1.5">
              <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4] flex-shrink-0" />
              <span className="text-xs text-[#66c0f4]">Steam</span>
            </div>
          </div>
          {achievement.hidden && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("type")}</span>
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3 flex-shrink-0" />
                {t("secret")}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onViewAll}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-[#66c0f4]/10 hover:bg-[#66c0f4]/20 border border-[#66c0f4]/30 rounded-lg text-sm text-[#66c0f4] transition-colors cursor-pointer"
        >
          <Trophy className="w-4 h-4 flex-shrink-0" />
          {t("viewAllInGame")}
        </button>

        <a
          href={`https://store.steampowered.com/app/${achievement.appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <SteamIcon className="w-4 h-4 flex-shrink-0" />
          {t("viewOnSteam")}
        </a>
      </div>
    </Modal>
  )
}

export default function SteamAchievements({ userId }) {
  const { t } = useTranslation("achievements.list")
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

    const fetchAchievements = async () => {
      try {
        const res = await fetch(`/api/steam/achievements?userId=${userId}`)
        const data = await res.json()
        setAchievements(data.achievements || [])
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [userId])

  if (loading || achievements.length === 0) return null

  const visible = showAll ? achievements : achievements.slice(0, 12)

  return (
    <div className="mt-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-zinc-600" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("title")}
          </span>
          <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
        </div>
        <span className="text-xs text-zinc-600">{t("count", { count: achievements.length })}</span>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
        {visible.map((achievement, i) => (
          <button
            key={`${achievement.appId}-${achievement.name}-${i}`}
            onClick={() => setSelected(achievement)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-yellow-500/50 transition-all hover:scale-105 cursor-pointer"
          >
            <img
              src={achievement.icon}
              alt={achievement.hidden ? t("hiddenAlt") : achievement.name}
              className={`w-full h-full object-cover ${achievement.hidden ? "blur-sm" : ""}`}
              loading="lazy"
            />
            {achievement.hidden && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <EyeOff className="w-3 h-3 text-zinc-400" />
              </div>
            )}
          </button>
        ))}
      </div>

      {achievements.length > 12 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          {showAll ? t("showLess") : t("viewAll", { count: achievements.length })}
        </button>
      )}

      <RecentAchievementModal
        achievement={selected}
        isOpen={!!selected && !gameModal}
        onClose={() => setSelected(null)}
        onViewAll={() => {
          if (selected) {
            setGameModal({
              appId: selected.appId,
              game: selected.game,
              banner: `https://cdn.cloudflare.steamstatic.com/steam/apps/${selected.appId}/header.jpg`
            })
          }
        }}
      />

      <GameAchievementsModal
        game={gameModal}
        userId={userId}
        isOpen={!!gameModal}
        onClose={() => {
          setGameModal(null)
          setSelected(null)
        }}
      />
    </div>
  )
}

export function GameSteamAchievements({ appId }) {
  const { t } = useTranslation("achievements.gameSection")
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

    const fetchAchievements = async () => {
      try {
        const params = new URLSearchParams({ appId })
        if (user?.user_id) params.append("userId", user.user_id)

        const res = await fetch(`/api/steam/gameAchievements?${params}`)
        const json = await res.json()
        setData(json)
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [appId, user?.user_id])

  if (loading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-zinc-600" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("title")}
          </span>
          <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data || data.total === 0) return null

  const filtered = data.achievements.filter(a => {
    if (filter === "unlocked") return a.achieved
    if (filter === "locked") return !a.achieved
    return true
  })

  const visible = showAll ? filtered : filtered.slice(0, 12)

  return (
    <>
      <hr className="my-6 border-zinc-700" />
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-zinc-600" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("title")}
            </span>
            <SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
          </div>
          {!data.notConnected && (
            <span className="text-xs text-zinc-500">
              {data.unlocked}/{data.total} ({data.percentage}%)
            </span>
          )}
        </div>

        {data.notConnected && (
          <div className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg mb-4">
            <SteamIcon className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-400">
              {t("connectSteam")}
            </span>
          </div>
        )}

        {!data.notConnected && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${data.percentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          {["all", "unlocked", "locked"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filter === f
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-500 hover:text-white"
              }`}
            >
              {t(`filter.${f}`, { 
                count: f === "all" ? data.total : f === "unlocked" ? data.unlocked : data.total - data.unlocked 
              })}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
          {visible.map((achievement, i) => {
            const isHidden = achievement.hidden && !achievement.achieved

            return (
              <button
                key={`${achievement.name}-${i}`}
                onClick={() => setSelected(achievement)}
                className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-zinc-500 transition-all hover:scale-105 cursor-pointer ${!achievement.achieved ? "grayscale opacity-60" : ""}`}
              >
                <img
                  src={achievement.achieved ? achievement.iconUnlocked : achievement.iconLocked}
                  alt={isHidden ? t("hiddenAlt") : achievement.name}
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

        {filtered.length > 12 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {showAll ? t("showLess") : t("viewAll", { count: filtered.length })}
          </button>
        )}

        <AchievementDetailModal
          achievement={selected}
          gameName={data.gameName}
          appId={appId}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          showGame={false}
        />
      </div>
    </>
  )
}
