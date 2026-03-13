import { useState, useEffect } from "react"
import { Trophy, EyeOff, Eye, ChevronLeft, Loader2, ChevronRight } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { PlayStationIcon } from "#constants/customIcons"
import { getTimeAgoFromTimestamp } from "#utils/formatDate"

const TROPHY_STYLES = {
  platinum: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  gold: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  silver: { color: "text-zinc-300", bg: "bg-zinc-400/10", border: "border-zinc-400/30" },
  bronze: { color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" }
}

function TrophyIcon({ type, className = "w-4 h-4" }) {
  const style = TROPHY_STYLES[type] || TROPHY_STYLES.bronze
  return <Trophy className={`${className} ${style.color}`} />
}

function TrophyDetailModal({ trophy, gameName, gameId, gameIcon, isOpen, onClose, onBack, showGame = true }) {
  const { t } = useTranslation("trophies.detail")
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isOpen) setRevealed(false)
  }, [isOpen])

  if (!trophy) return null

  const isHidden = trophy.trophyHidden && !trophy.earned && !revealed
  const style = TROPHY_STYLES[trophy.trophyType] || TROPHY_STYLES.bronze

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
              src={trophy.trophyIconUrl}
              alt={isHidden ? t("hiddenAlt") : trophy.trophyName}
              className={`w-16 h-16 rounded-lg border border-zinc-700 ${isHidden ? "blur-md" : ""} ${!trophy.earned ? "grayscale opacity-60" : ""}`}
            />
            {isHidden && (
              <div className="absolute inset-0 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <TrophyIcon type={trophy.trophyType} className="w-4 h-4" />
              <span className={`text-xs font-medium capitalize ${style.color}`}>
                {trophy.trophyType}
              </span>
            </div>
            <h3 className="text-base font-bold text-white break-words">
              {isHidden ? t("hiddenTitle") : trophy.trophyName}
            </h3>
            {isHidden ? (
              <p className="text-sm text-zinc-500 mt-1">{t("hiddenDescription")}</p>
            ) : (
              trophy.trophyDetail && (
                <p className="text-sm text-zinc-400 mt-1 break-words">{trophy.trophyDetail}</p>
              )
            )}
          </div>
        </div>

        {trophy.trophyHidden && !trophy.earned && (
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
          {showGame && gameName && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("game")}</span>
              <div className="flex items-center gap-2 min-w-0">
                {gameIcon && (
                  <img
                    src={gameIcon}
                    alt={gameName}
                    className="w-8 h-8 object-cover rounded flex-shrink-0"
                  />
                )}
                <span className="text-xs text-white font-medium truncate">{gameName}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-zinc-500 flex-shrink-0">{t("status")}</span>
            <span className={`text-xs font-medium ${trophy.earned ? "text-green-400" : "text-zinc-500"}`}>
              {trophy.earned ? t("unlocked") : t("locked")}
            </span>
          </div>
          {trophy.earned && trophy.earnedDateTime && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("unlockedAt")}</span>
              <span className="text-xs text-white truncate">{getTimeAgoFromTimestamp(trophy.earnedDateTime)}</span>
            </div>
          )}
          {trophy.trophyEarnedRate !== undefined && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs text-zinc-500 flex-shrink-0">{t("rarity")}</span>
              <span className={`text-xs font-medium ${
                parseFloat(trophy.trophyEarnedRate) < 5 ? "text-yellow-400" :
                parseFloat(trophy.trophyEarnedRate) < 20 ? "text-purple-400" :
                parseFloat(trophy.trophyEarnedRate) < 50 ? "text-blue-400" : "text-zinc-400"
              }`}>
                {t("rarityPercent", { percent: trophy.trophyEarnedRate })}
              </span>
            </div>
          )}
          {trophy.trophyHidden && (
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
              <PlayStationIcon className="w-3.5 h-3.5 text-[#0070cc] flex-shrink-0" />
              <span className="text-xs text-[#0070cc]">PlayStation</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function GameTrophiesModal({ game, userId, isOpen, onClose }) {
  const { t } = useTranslation("trophies.gameModal")
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

    const fetchTrophies = async () => {
      try {
        const res = await fetch("/api/psn/trophies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, gameId: game.id })
        })
        const json = await res.json()
        setData(json)
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchTrophies()
  }, [isOpen, game, userId])

  if (!game) return null

  if (selected) {
    return (
      <TrophyDetailModal
        trophy={selected}
        gameName={game.name}
        gameId={game.id}
        gameIcon={game.iconUrl}
        isOpen={isOpen}
        onClose={onClose}
        onBack={() => setSelected(null)}
        showGame={false}
      />
    )
  }

  const filtered = data?.trophies?.filter(t => {
    const statusMatch = filter === "all" || 
      (filter === "unlocked" && t.earned) || 
      (filter === "locked" && !t.earned)
    const typeMatch = typeFilter === "all" || t.trophyType === typeFilter
    return statusMatch && typeMatch
  }) || []

  const earnedCount = data?.trophies?.filter(t => t.earned).length || 0
  const totalCount = data?.total || 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={game.iconUrl}
            alt={game.name}
            className="w-14 h-14 object-cover rounded-lg border border-zinc-700"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white truncate">{game.name}</h3>
            <div className="text-xs text-zinc-500 mt-0.5">{game.platform}</div>
            {data && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#003791] to-[#0070cc] rounded-full transition-all"
                    style={{ width: `${game.progress}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 flex-shrink-0">
                  {earnedCount}/{totalCount} ({game.progress}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : data?.trophies?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">{t("noTrophies")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
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

            <div className="flex items-center gap-1.5 mb-4">
              {["all", "platinum", "gold", "silver", "bronze"].map(type => {
                const style = TROPHY_STYLES[type]
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      typeFilter === type
                        ? `${style?.bg || "bg-zinc-700"} ${style?.color || "text-white"} ${style?.border || "border-zinc-600"} border`
                        : "bg-zinc-800/50 text-zinc-500 hover:text-white border border-transparent"
                    }`}
                  >
                    {type !== "all" && <Trophy className="w-3 h-3" />}
                    {type === "all" ? t("filter.allTypes") : t(`types.${type}`)}
                  </button>
                )
              })}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {filtered.map((trophy, i) => {
                const isHidden = trophy.trophyHidden && !trophy.earned
                const style = TROPHY_STYLES[trophy.trophyType] || TROPHY_STYLES.bronze

                return (
                  <button
                    key={`${trophy.trophyId}-${i}`}
                    onClick={() => setSelected(trophy)}
                    className="w-full flex items-center gap-3 p-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all cursor-pointer text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={trophy.trophyIconUrl}
                        alt={isHidden ? t("hiddenAlt") : trophy.trophyName}
                        className={`w-10 h-10 rounded-md ${isHidden ? "blur-sm" : ""} ${!trophy.earned ? "grayscale opacity-60" : ""}`}
                      />
                      {isHidden && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <EyeOff className="w-3 h-3 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TrophyIcon type={trophy.trophyType} className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-white truncate">
                          {isHidden ? t("hiddenTitle") : trophy.trophyName}
                        </span>
                        {trophy.trophyHidden && (
                          <EyeOff className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {trophy.trophyEarnedRate && (
                          <span className={`text-xs ${
                            parseFloat(trophy.trophyEarnedRate) < 5 ? "text-yellow-400" :
                            parseFloat(trophy.trophyEarnedRate) < 20 ? "text-purple-400" :
                            parseFloat(trophy.trophyEarnedRate) < 50 ? "text-blue-400" : "text-zinc-500"
                          }`}>
                            {trophy.trophyEarnedRate}%
                          </span>
                        )}
                        {trophy.earned && (
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
      </div>
    </Modal>
  )
}

function AllGamesModal({ userId, allGames, isOpen, onClose, onSelectGame }) {
  const { t } = useTranslation("trophies.allGames")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!isOpen) setSearch("")
  }, [isOpen])

  const filtered = allGames.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <PlayStationIcon className="w-4 h-4 text-[#0070cc]" />
          <h3 className="text-base font-bold text-white">{t("title")}</h3>
          <span className="text-xs text-zinc-500 ml-auto">
            {allGames.length} {t("gamesCount")}
          </span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 mb-4"
        />

        <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">{t("noResults")}</p>
            </div>
          ) : (
            filtered.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  onSelectGame(game)
                  onClose()
                }}
                className="w-full flex items-center gap-3 p-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all cursor-pointer text-left"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={game.iconUrl}
                    alt={game.name}
                    className="w-12 h-12 rounded-lg object-cover border border-zinc-700/50"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                    <PlayStationIcon className="w-2.5 h-2.5 text-[#0070cc]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{game.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <TrophySummary
                      earnedTrophies={game.earnedTrophies}
                      definedTrophies={game.definedTrophies}
                      compact
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#003791] to-[#0070cc] transition-all"
                        style={{ width: `${game.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 flex-shrink-0">{game.progress}%</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

function TrophySummary({ earnedTrophies, definedTrophies, compact = false }) {
  const types = ["platinum", "gold", "silver", "bronze"]

  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
      {types.map(type => {
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

export default function PSNTrophies({ userId, compact = false }) {
  const { t } = useTranslation("trophies.list")
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

    const fetchGames = async () => {
      try {
        const res = await fetch("/api/psn/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId })
        })
        const data = await res.json()

        if (res.ok && data.games) {
          const sorted = data.games
            .filter(g => g.progress > 0)
            .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))

          setAllGames(sorted)
          setGames(sorted.slice(0, compact ? 3 : 5))
        }
      } catch {} finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [userId, compact])

  if (loading) {
    return (
      <div className="mt-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700/50">
          <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" />
            {t("title")}
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
            {t("title")}
            <PlayStationIcon className="w-3 h-3 text-[#0070cc]" />
          </h3>
          {allGames.length > games.length && (
            <button
              onClick={() => setShowAllGames(true)}
              className="text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              {t("viewAll", { count: allGames.length })}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="divide-y divide-zinc-700/30">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className="w-full text-left group relative overflow-hidden cursor-pointer"
            >
              <div className="p-3 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors">
                <div className="relative flex-shrink-0">
                  <img
                    src={game.iconUrl}
                    alt={game.name}
                    className="w-12 h-12 rounded-lg object-cover border border-zinc-700/50"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                    <PlayStationIcon className="w-2.5 h-2.5 text-[#0070cc]" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate mb-1">
                    {game.name}
                  </div>

                  <TrophySummary
                    earnedTrophies={game.earnedTrophies}
                    definedTrophies={game.definedTrophies}
                    compact
                  />

                  {!compact && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                        <span>{game.platform}</span>
                        <span>{game.progress}%</span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#003791] to-[#0070cc] transition-all duration-500"
                          style={{ width: `${game.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AllGamesModal
        userId={userId}
        allGames={allGames}
        isOpen={showAllGames}
        onClose={() => setShowAllGames(false)}
        onSelectGame={setSelectedGame}
      />

      <GameTrophiesModal
        game={selectedGame}
        userId={userId}
        isOpen={!!selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </>
  )
}

function normalizeGameName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/remastered|remake|edition|goty|deluxe|ultimate|definitive/g, "")
}

export function GamePSNTrophies({ gameName, gameIcon }) {
  const { t } = useTranslation("trophies.gameSection")
  const { user } = useAuth()
  const [psnGame, setPsnGame] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!user?.user_id || !gameName) {
      setLoading(false)
      return
    }

    setLoading(true)
    setPsnGame(null)
    setData(null)
    setSelected(null)
    setFilter("all")
    setTypeFilter("all")
    setShowAll(false)

    const fetchData = async () => {
      try {
        const gamesRes = await fetch("/api/psn/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.user_id })
        })
        const gamesData = await gamesRes.json()

        if (!gamesData.games?.length) {
          setLoading(false)
          return
        }

        const normalizedSearch = normalizeGameName(gameName)
        const foundGame = gamesData.games.find(g => {
          const normalizedPsn = normalizeGameName(g.name)
          return normalizedPsn === normalizedSearch ||
                 normalizedPsn.includes(normalizedSearch) ||
                 normalizedSearch.includes(normalizedPsn)
        })

        if (!foundGame) {
          setLoading(false)
          return
        }

        setPsnGame(foundGame)

        const trophiesRes = await fetch("/api/psn/trophies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.user_id, gameId: foundGame.id })
        })
        const trophiesData = await trophiesRes.json()
        setData(trophiesData)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.user_id, gameName])

  if (loading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-zinc-600" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("title")}
          </span>
          <PlayStationIcon className="w-3.5 h-3.5 text-[#0070cc]" />
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!psnGame || !data || data.total === 0) return null

  const filtered = data.trophies.filter(t => {
    const statusMatch = filter === "all" ||
      (filter === "unlocked" && t.earned) ||
      (filter === "locked" && !t.earned)
    const typeMatch = typeFilter === "all" || t.trophyType === typeFilter
    return statusMatch && typeMatch
  })

  const visible = showAll ? filtered : filtered.slice(0, 12)
  const earnedCount = data.trophies.filter(t => t.earned).length
  const percentage = Math.round((earnedCount / data.total) * 100)

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
            <PlayStationIcon className="w-3.5 h-3.5 text-[#0070cc]" />
          </div>
          <span className="text-xs text-zinc-500">
            {earnedCount}/{data.total} ({percentage}%)
          </span>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#003791] to-[#0070cc] rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                count: f === "all" ? data.total : f === "unlocked" ? earnedCount : data.total - earnedCount
              })}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          {["all", "platinum", "gold", "silver", "bronze"].map(type => {
            const style = TROPHY_STYLES[type]
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  typeFilter === type
                    ? `${style?.bg || "bg-zinc-700"} ${style?.color || "text-white"} ${style?.border || "border-zinc-600"} border`
                    : "bg-zinc-800/50 text-zinc-500 hover:text-white border border-transparent"
                }`}
              >
                {type !== "all" && <Trophy className="w-3 h-3" />}
                {type === "all" ? t("filter.allTypes") : t(`types.${type}`)}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
          {visible.map((trophy, i) => {
            const isHidden = trophy.trophyHidden && !trophy.earned
            const style = TROPHY_STYLES[trophy.trophyType]

            return (
              <button
                key={`${trophy.trophyId}-${i}`}
                onClick={() => setSelected(trophy)}
                className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border hover:border-zinc-500 transition-all hover:scale-105 cursor-pointer ${!trophy.earned ? "grayscale opacity-60 border-zinc-700/50" : style.border}`}
              >
                <img
                  src={trophy.trophyIconUrl}
                  alt={isHidden ? t("hiddenAlt") : trophy.trophyName}
                  className={`w-full h-full object-cover ${isHidden ? "blur-sm" : ""}`}
                  loading="lazy"
                />
                {isHidden && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <EyeOff className="w-3 h-3 text-zinc-400" />
                  </div>
                )}
                <div className={`absolute bottom-0 right-0 p-0.5 ${style.bg} rounded-tl`}>
                  <Trophy className={`w-2 h-2 ${style.color}`} />
                </div>
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

        <TrophyDetailModal
          trophy={selected}
          gameName={psnGame.name}
          gameId={psnGame.id}
          gameIcon={psnGame.iconUrl || gameIcon}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          showGame={false}
        />
      </div>
    </>
  )
}
