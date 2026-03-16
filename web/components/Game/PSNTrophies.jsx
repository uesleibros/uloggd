import { useState, useEffect } from "react"
import { Trophy, EyeOff, Eye, Loader2, ChevronRight } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { PlayStationIcon } from "#constants/customIcons"
import { getTimeAgoFromTimestamp } from "#utils/formatDate"

const TROPHY_STYLES = {
  platinum: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  gold: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  silver: { color: "text-zinc-300", bg: "bg-zinc-400/10", border: "border-zinc-400/30" },
  bronze: { color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
}

function TrophySummary({ earnedTrophies, definedTrophies, compact = false }) {
  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
      {["platinum", "gold", "silver", "bronze"].map(type => {
        const earned = earnedTrophies?.[type] || 0
        const total = definedTrophies?.[type] || 0
        if (total === 0) return null
        const style = TROPHY_STYLES[type]
        return (
          <div key={type} className={`flex items-center gap-0.5 ${compact ? "text-[10px]" : "text-xs"} ${style.color}`}>
            <Trophy className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
            <span className="font-medium tabular-nums">{earned}/{total}</span>
          </div>
        )
      })}
    </div>
  )
}

function TrophyGrid({ trophies, onSelect, showLockState = false, columns = "grid-cols-6 sm:grid-cols-8" }) {
  return (
    <div className={`grid ${columns} gap-1.5 sm:gap-2`}>
      {trophies.map((trophy, i) => {
        const isHidden = trophy.trophyHidden && !trophy.earned
        const isLocked = showLockState && !trophy.earned
        const style = TROPHY_STYLES[trophy.trophyType] || TROPHY_STYLES.bronze

        return (
          <button
            key={`${trophy.trophyId}-${i}`}
            onClick={() => onSelect(trophy)}
            className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border transition-all hover:scale-105 cursor-pointer ${
              isLocked ? "border-zinc-700/50 grayscale opacity-50 hover:opacity-70" : `${style.border} hover:brightness-110`
            }`}
          >
            <img
              src={trophy.trophyIconUrl}
              alt=""
              className={`w-full h-full object-cover ${isHidden ? "blur-sm" : ""}`}
              loading="lazy"
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <EyeOff className="w-3 h-3 text-zinc-400" />
              </div>
            )}
            {!isLocked && (
              <div className={`absolute bottom-0 right-0 p-0.5 ${style.bg} rounded-tl`}>
                <Trophy className={`w-2 h-2 ${style.color}`} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function StatusFilterTabs({ filter, onFilter, counts }) {
  const { t } = useTranslation("trophies")

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
      {["all", "unlocked", "locked"].map(f => (
        <button
          key={f}
          onClick={() => onFilter(f)}
          className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
            filter === f ? "bg-zinc-700 text-white" : "bg-zinc-800/50 text-zinc-500 hover:text-white"
          }`}
        >
          {t(`filter.${f}`)} ({counts[f]})
        </button>
      ))}
    </div>
  )
}

function TypeFilterTabs({ typeFilter, onFilter }) {
  const { t } = useTranslation("trophies")

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
      {["all", "platinum", "gold", "silver", "bronze"].map(type => {
        const style = TROPHY_STYLES[type]
        return (
          <button
            key={type}
            onClick={() => onFilter(type)}
            className={`px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              typeFilter === type
                ? `${style?.bg || "bg-zinc-700"} ${style?.color || "text-white"} ${style?.border || "border-zinc-600"} border`
                : "bg-zinc-800/50 text-zinc-500 hover:text-white border border-transparent"
            }`}
          >
            {type !== "all" && <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {type === "all" ? t("filter.allTypes") : t(`types.${type}`)}
          </button>
        )
      })}
    </div>
  )
}

function ProgressBar({ percentage }) {
  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#003791] to-[#0070cc] rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function TrophyDetailModal({ trophy, gameName, gameIcon, isOpen, onClose, showGame = true }) {
  const { t } = useTranslation("trophies")
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!trophy) return null

  const isHidden = trophy.trophyHidden && !trophy.earned && !revealed
  const style = TROPHY_STYLES[trophy.trophyType] || TROPHY_STYLES.bronze

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm" fullscreenMobile showMobileGrip>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={trophy.trophyIconUrl}
              alt=""
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-zinc-700 bg-zinc-800 ${
                isHidden ? "blur-md" : ""
              } ${!trophy.earned ? "grayscale opacity-60" : ""}`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className={`w-4 h-4 ${style.color}`} />
              <span className={`text-xs font-medium capitalize ${style.color}`}>{trophy.trophyType}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white break-words">
              {isHidden ? t("detail.hiddenTitle") : trophy.trophyName}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 break-words">
              {isHidden ? t("detail.hiddenDescription") : trophy.trophyDetail}
            </p>
          </div>
        </div>

        {trophy.trophyHidden && !trophy.earned && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="flex items-center gap-2 w-full py-2.5 px-3 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-sm text-yellow-400 transition-colors cursor-pointer"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {revealed ? t("detail.hideDetails") : t("detail.revealWarning")}
          </button>
        )}

        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 divide-y divide-zinc-700/50">
          {showGame && gameName && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.game")}</span>
              <div className="flex items-center gap-2 min-w-0">
                {gameIcon && <img src={gameIcon} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />}
                <span className="text-xs text-white font-medium truncate">{gameName}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs text-zinc-500">{t("detail.status")}</span>
            <span className={`text-xs font-medium ${trophy.earned ? "text-green-400" : "text-zinc-500"}`}>
              {trophy.earned ? t("detail.unlocked") : t("detail.locked")}
            </span>
          </div>

          {trophy.earned && trophy.earnedDateTime && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.unlockedAt")}</span>
              <span className="text-xs text-white">{getTimeAgoFromTimestamp(trophy.earnedDateTime)}</span>
            </div>
          )}

          {trophy.trophyEarnedRate !== undefined && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-zinc-500">{t("detail.rarity")}</span>
              <span className={`text-xs font-medium ${
                parseFloat(trophy.trophyEarnedRate) < 5 ? "text-yellow-400" :
                parseFloat(trophy.trophyEarnedRate) < 20 ? "text-purple-400" :
                parseFloat(trophy.trophyEarnedRate) < 50 ? "text-blue-400" : "text-zinc-400"
              }`}>
                {trophy.trophyEarnedRate}%
              </span>
            </div>
          )}

          {trophy.trophyHidden && (
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
              <PlayStationIcon className="w-3.5 h-3.5 text-[#0070cc]" />
              <span className="text-xs text-[#0070cc]">PlayStation</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function GameTrophiesModal({ game, userId, isOpen, onClose }) {
  const { t } = useTranslation("trophies")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    if (!isOpen || !game) return

    setLoading(true)
    setData(null)
    setSelected(null)
    setFilter("all")
    setTypeFilter("all")

    fetch("/api/psn/trophies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, gameId: game.id }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, game, userId])

  if (!game) return null

  if (selected) {
    return (
      <TrophyDetailModal
        trophy={selected}
        gameName={game.name}
        gameIcon={game.iconUrl}
        isOpen={isOpen}
        onClose={() => { setSelected(null); onClose() }}
        showGame={false}
      />
    )
  }

  const earnedCount = data?.trophies?.filter(t => t.earned).length || 0
  const totalCount = data?.total || 0

  const filtered = data?.trophies?.filter(t => {
    const statusMatch = filter === "all" || (filter === "unlocked" && t.earned) || (filter === "locked" && !t.earned)
    const typeMatch = typeFilter === "all" || t.trophyType === typeFilter
    return statusMatch && typeMatch
  }) || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <div className="flex flex-col h-full">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src={game.iconUrl} alt="" className="w-12 sm:w-14 h-12 sm:h-14 rounded-xl object-cover border border-zinc-700 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">{game.name}</h3>
              <div className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">{game.platform}</div>
              {data && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1">
                    <ProgressBar percentage={game.progress} />
                  </div>
                  <span className="text-[11px] sm:text-xs text-zinc-400 flex-shrink-0">
                    {earnedCount}/{totalCount}
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
          ) : !data?.trophies?.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Trophy className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">{t("gameModal.noTrophies")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 sm:space-y-3 mb-4">
                <StatusFilterTabs
                  filter={filter}
                  onFilter={setFilter}
                  counts={{ all: totalCount, unlocked: earnedCount, locked: totalCount - earnedCount }}
                />
                <TypeFilterTabs typeFilter={typeFilter} onFilter={setTypeFilter} />
              </div>

              <div className="space-y-1.5">
                {filtered.map((trophy, i) => {
                  const isHidden = trophy.trophyHidden && !trophy.earned
                  const style = TROPHY_STYLES[trophy.trophyType] || TROPHY_STYLES.bronze

                  return (
                    <button
                      key={`${trophy.trophyId}-${i}`}
                      onClick={() => setSelected(trophy)}
                      className="w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 rounded-xl transition-all cursor-pointer text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={trophy.trophyIconUrl}
                          alt=""
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-800 ${
                            isHidden ? "blur-sm" : ""
                          } ${!trophy.earned ? "grayscale opacity-50" : ""}`}
                        />
                        {isHidden && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <EyeOff className="w-3 h-3 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Trophy className={`w-3 h-3 ${style.color} flex-shrink-0`} />
                          <span className={`text-xs sm:text-sm font-medium truncate ${trophy.earned ? "text-white" : "text-zinc-500"}`}>
                            {isHidden ? t("detail.hiddenTitle") : trophy.trophyName}
                          </span>
                          {trophy.trophyHidden && <EyeOff className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {trophy.trophyEarnedRate && (
                            <span className={`text-[11px] sm:text-xs ${
                              parseFloat(trophy.trophyEarnedRate) < 5 ? "text-yellow-400" :
                              parseFloat(trophy.trophyEarnedRate) < 20 ? "text-purple-400" :
                              parseFloat(trophy.trophyEarnedRate) < 50 ? "text-blue-400" : "text-zinc-600"
                            }`}>
                              {trophy.trophyEarnedRate}%
                            </span>
                          )}
                          {trophy.earned && <span className="text-[11px] sm:text-xs text-green-400">✓</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

function AllGamesModal({ userId, allGames, isOpen, onClose, onSelectGame }) {
  const { t } = useTranslation("trophies")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!isOpen) setSearch("")
  }, [isOpen])

  const filtered = allGames.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" fullscreenMobile showMobileGrip noScroll>
      <div className="flex flex-col h-full">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <PlayStationIcon className="w-4 h-4 text-[#0070cc]" />
            <h3 className="text-sm sm:text-base font-bold text-white">{t("allGames.title")}</h3>
            <span className="text-xs text-zinc-500 ml-auto">{allGames.length} {t("allGames.gamesCount")}</span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("allGames.searchPlaceholder")}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Trophy className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">{t("allGames.noResults")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((game) => (
                <button
                  key={game.id}
                  onClick={() => { onSelectGame(game); onClose() }}
                  className="w-full flex items-center gap-3 p-2.5 sm:p-3 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 rounded-xl transition-all cursor-pointer text-left"
                >
                  <div className="relative flex-shrink-0">
                    <img src={game.iconUrl} alt="" className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-zinc-700/50" />
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                      <PlayStationIcon className="w-2.5 h-2.5 text-[#0070cc]" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-white truncate">{game.name}</div>
                    <TrophySummary earnedTrophies={game.earnedTrophies} definedTrophies={game.definedTrophies} compact />
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1"><ProgressBar percentage={game.progress} /></div>
                      <span className="text-[10px] text-zinc-500 flex-shrink-0">{game.progress}%</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function normalizeGameName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/remastered|remake|edition|goty|deluxe|ultimate|definitive/g, "")
}

export default function PSNTrophies({ userId, compact = false }) {
  const { t } = useTranslation("trophies")
  const [games, setGames] = useState([])
  const [allGames, setAllGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState(null)
  const [showAllGames, setShowAllGames] = useState(false)

  useEffect(() => {
    setGames([])
    setAllGames([])
    setLoading(true)
    setSelectedGame(null)
    setShowAllGames(false)

    if (!userId) return

    fetch("/api/psn/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
      .then(r => r.ok ? r.json() : { games: [] })
      .then(data => {
        const sorted = (data.games || []).filter(g => g.progress > 0).sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        setAllGames(sorted)
        setGames(sorted.slice(0, compact ? 3 : 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, compact])

  if (loading) {
    return (
      <div className="mt-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700/50">
          <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" />
            {t("profile.title")}
            <PlayStationIcon className="w-3 h-3 text-[#0070cc]" />
          </h3>
        </div>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (games.length === 0) return null

  return (
    <>
      <div className="mt-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center justify-between">
          <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" />
            {t("profile.title")}
            <PlayStationIcon className="w-3 h-3 text-[#0070cc]" />
          </h3>
          {allGames.length > games.length && (
            <button
              onClick={() => setShowAllGames(true)}
              className="text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              {t("profile.viewAll", { count: allGames.length })}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="divide-y divide-zinc-700/30">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className="w-full text-left cursor-pointer"
            >
              <div className="p-3 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors">
                <div className="relative flex-shrink-0">
                  <img src={game.iconUrl} alt="" className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-zinc-700/50" />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                    <PlayStationIcon className="w-2.5 h-2.5 text-[#0070cc]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-white truncate mb-1">{game.name}</div>
                  <TrophySummary earnedTrophies={game.earnedTrophies} definedTrophies={game.definedTrophies} compact />
                  {!compact && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                        <span>{game.platform}</span>
                        <span>{game.progress}%</span>
                      </div>
                      <ProgressBar percentage={game.progress} />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AllGamesModal userId={userId} allGames={allGames} isOpen={showAllGames} onClose={() => setShowAllGames(false)} onSelectGame={setSelectedGame} />
      <GameTrophiesModal game={selectedGame} userId={userId} isOpen={!!selectedGame} onClose={() => setSelectedGame(null)} />
    </>
  )
}

export function GamePSNTrophies({ gameName, gameIcon }) {
  const { t } = useTranslation("trophies")
  const { user } = useAuth()
  const [psnGame, setPsnGame] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!user?.user_id || !gameName) { setLoading(false); return }

    setLoading(true)
    setPsnGame(null)
    setData(null)
    setSelected(null)
    setFilter("all")
    setTypeFilter("all")
    setShowAll(false)

    fetch("/api/psn/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.user_id }),
    })
      .then(r => r.ok ? r.json() : { games: [] })
      .then(async (gamesData) => {
        if (!gamesData.games?.length) return

        const normalizedSearch = normalizeGameName(gameName)
        const foundGame = gamesData.games.find(g => {
          const n = normalizeGameName(g.name)
          return n === normalizedSearch || n.includes(normalizedSearch) || normalizedSearch.includes(n)
        })

        if (!foundGame) return

        setPsnGame(foundGame)

        const trophiesRes = await fetch("/api/psn/trophies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.user_id, gameId: foundGame.id }),
        })
        const trophiesData = await trophiesRes.json()
        setData(trophiesData)
      })
      .catch(() => {})
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
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t("game.title")}</span>
            <PlayStationIcon className="w-3.5 h-3.5 text-[#0070cc]" />
          </div>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (!psnGame || !data || data.total === 0) return null

  const earnedCount = data.trophies.filter(t => t.earned).length
  const percentage = Math.round((earnedCount / data.total) * 100)

  const filtered = data.trophies.filter(t => {
    const statusMatch = filter === "all" || (filter === "unlocked" && t.earned) || (filter === "locked" && !t.earned)
    const typeMatch = typeFilter === "all" || t.trophyType === typeFilter
    return statusMatch && typeMatch
  })

  const visible = showAll ? filtered : filtered.slice(0, 18)

  return (
    <>
      <hr className="my-6 border-zinc-700" />
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex-shrink-0">{t("game.title")}</span>
            <PlayStationIcon className="w-3.5 h-3.5 text-[#0070cc] flex-shrink-0" />
          </div>
          <span className="text-xs text-zinc-500 flex-shrink-0">
            {earnedCount}/{data.total} ({percentage}%)
          </span>
        </div>

        <div className="mb-4">
          <ProgressBar percentage={percentage} />
        </div>

        <div className="space-y-2 sm:space-y-3 mb-4">
          <StatusFilterTabs
            filter={filter}
            onFilter={(f) => { setFilter(f); setShowAll(false) }}
            counts={{ all: data.total, unlocked: earnedCount, locked: data.total - earnedCount }}
          />
          <TypeFilterTabs typeFilter={typeFilter} onFilter={(t) => { setTypeFilter(t); setShowAll(false) }} />
        </div>

        <TrophyGrid
          trophies={visible}
          onSelect={setSelected}
          showLockState
          columns="grid-cols-6 sm:grid-cols-8 md:grid-cols-12"
        />

        {filtered.length > 18 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {showAll ? t("game.showLess") : t("game.viewAll", { count: filtered.length })}
          </button>
        )}

        <TrophyDetailModal
          trophy={selected}
          gameName={psnGame.name}
          gameIcon={psnGame.iconUrl || gameIcon}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          showGame={false}
        />
      </div>
    </>
  )
}
