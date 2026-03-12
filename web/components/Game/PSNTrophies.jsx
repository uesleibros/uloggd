import { useState, useEffect } from "react"
import { Trophy, ChevronRight, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { PlayStationIcon } from "#constants/customIcons"

export default function PSNTrophies({ userId, compact = false }) {
  const { t } = useTranslation("profile")
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetchRecentGames()
  }, [userId])

  async function fetchRecentGames() {
    setLoading(true)
    setError(false)

    try {
      const res = await fetch("/api/psn/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })

      const data = await res.json()

      if (res.ok && data.games) {
        const recent = data.games
          .filter(g => g.progress > 0)
          .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
          .slice(0, compact ? 3 : 5)
        
        setGames(recent)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700/50">
          <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" />
            {t("stats.psnTrophies")}
          </h3>
        </div>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || games.length === 0) return null

  return (
    <div className="mt-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" />
          {t("stats.psnTrophies")}
        </h3>
      </div>

      <div className="divide-y divide-zinc-700/30">
        {games.map((game) => (
          <GameTrophyRow key={game.id} game={game} compact={compact} />
        ))}
      </div>
    </div>
  )
}

function GameTrophyRow({ game, compact }) {
  const totalTrophies = 
    game.definedTrophies.bronze + 
    game.definedTrophies.silver + 
    game.definedTrophies.gold + 
    game.definedTrophies.platinum

  const earnedTotal = 
    game.earnedTrophies.bronze + 
    game.earnedTrophies.silver + 
    game.earnedTrophies.gold + 
    game.earnedTrophies.platinum

  return (
    <div className="group relative overflow-hidden">
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

          <div className="flex items-center gap-2">
            <TrophyBadge type="platinum" earned={game.earnedTrophies.platinum} total={game.definedTrophies.platinum} />
            <TrophyBadge type="gold" earned={game.earnedTrophies.gold} total={game.definedTrophies.gold} />
            <TrophyBadge type="silver" earned={game.earnedTrophies.silver} total={game.definedTrophies.silver} />
            <TrophyBadge type="bronze" earned={game.earnedTrophies.bronze} total={game.definedTrophies.bronze} />
          </div>

          {!compact && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                <span>{earnedTotal}/{totalTrophies}</span>
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

        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
      </div>
    </div>
  )
}

function TrophyBadge({ type, earned, total }) {
  if (total === 0) return null

  const styles = {
    platinum: "text-cyan-400",
    gold: "text-amber-400",
    silver: "text-zinc-300",
    bronze: "text-orange-600"
  }

  return (
    <div className={`flex items-center gap-0.5 text-[10px] ${styles[type]}`}>
      <Trophy className="w-2.5 h-2.5" />
      <span className="font-medium tabular-nums">{earned}/{total}</span>
    </div>
  )
}
