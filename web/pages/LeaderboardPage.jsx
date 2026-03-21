import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  Trophy, Gem, MessageSquare, Users, Heart,
  Crown, Medal, Award, Star, List, LayoutGrid, Camera, Clock, Globe, BookOpen,
  HelpCircle, X
} from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import { SteamIcon } from "#constants/customIcons"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import DragScrollRow from "@components/UI/DragScrollRow"
import Pagination from "@components/UI/Pagination"
import { MINERALS } from "@components/Minerals/MineralRow"

const CATEGORIES = [
  { id: "global", icon: Globe },
  { id: "minerals", icon: Gem },
  { id: "reviews", icon: MessageSquare },
  { id: "followers", icon: Users },
  { id: "likes", icon: Heart },
  { id: "playtime", icon: Clock },
]

const RANK_CONFIG = {
  1: {
    icon: Crown,
    color: "text-amber-400",
    border: "border-amber-500/50",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  },
  2: {
    icon: Medal,
    color: "text-zinc-300",
    border: "border-zinc-400/40",
    glow: "shadow-[0_0_12px_rgba(161,161,170,0.1)]",
  },
  3: {
    icon: Award,
    color: "text-amber-600",
    border: "border-amber-700/40",
    glow: "shadow-[0_0_12px_rgba(180,83,9,0.1)]",
  },
}

const GLOBAL_BREAKDOWN_CONFIG = [
  { key: "minerals", icon: Gem, color: "text-zinc-400" },
  { key: "reviews", icon: MessageSquare, color: "text-zinc-400" },
  { key: "likesReceived", icon: Heart, color: "text-zinc-400" },
  { key: "likesGiven", icon: Heart, color: "text-zinc-500" },
]

const LIKES_BREAKDOWN_CONFIG = [
  { key: "reviews", icon: MessageSquare },
  { key: "lists", icon: List },
  { key: "tierlists", icon: LayoutGrid },
  { key: "screenshots", icon: Camera },
]

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        {[2, 1, 3].map((rank) => (
          <div
            key={rank}
            className={`p-4 bg-zinc-800/30 rounded-xl animate-pulse ${
              rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"
            }`}
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-zinc-700/50 rounded-full mb-3" />
              <div className="w-14 h-14 bg-zinc-700/50 rounded-full mb-3" />
              <div className="w-16 h-4 bg-zinc-700/50 rounded mb-2" />
              <div className="w-12 h-3 bg-zinc-700/30 rounded" />
            </div>
          </div>
        ))}
      </div>
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-zinc-800/20 rounded-xl animate-pulse">
          <div className="w-6 h-6 bg-zinc-700/50 rounded" />
          <div className="w-10 h-10 bg-zinc-700/50 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="w-32 h-4 bg-zinc-700/50 rounded" />
            <div className="w-20 h-3 bg-zinc-700/30 rounded" />
          </div>
          <div className="w-16 h-5 bg-zinc-700/50 rounded" />
        </div>
      ))}
    </div>
  )
}

function CategoryTabs({ active, onChange, t }) {
  return (
    <div className="border-b border-zinc-800/80">
      <DragScrollRow className="-mb-px">
        <nav className="flex gap-1 w-max">
          {CATEGORIES.map(({ id, icon: Icon }) => {
            const isActive = active === id

            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                />
                {t(`leaderboard.categories.${id}`)}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-t-full" />
                )}
              </button>
            )
          })}
        </nav>
      </DragScrollRow>
    </div>
  )
}

function HintBox({ category, t, onClose }) {
  return (
    <div className="relative bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 mb-4">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-violet-400/60 hover:text-violet-300 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="pr-6">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-violet-300">
            {t(`leaderboard.hint.${category}.title`)}
          </h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {t(`leaderboard.hint.${category}.description`)}
        </p>
        {category === "global" && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-[11px] text-zinc-500">
              <span className="text-violet-400/80 font-medium">{t("leaderboard.categories.reviews")}</span>{" "}
              <span className="text-violet-400/60">×2</span>
            </span>
            <span className="text-[11px] text-zinc-500">
              <span className="text-violet-400/80 font-medium">{t("leaderboard.hint.global.likesReceived")}</span>{" "}
              <span className="text-violet-400/60">×1</span>
            </span>
            <span className="text-[11px] text-zinc-500">
              <span className="text-violet-400/80 font-medium">{t("leaderboard.hint.global.likesGiven")}</span>{" "}
              <span className="text-violet-400/60">×0.25</span>
            </span>
            <span className="text-[11px] text-zinc-500">
              <span className="text-violet-400/80 font-medium">{t("leaderboard.categories.minerals")}</span>{" "}
              <span className="text-violet-400/60">×0.25</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function MineralBreakdown({ breakdown, compact = false }) {
  if (!breakdown) return null

  const nonZero = MINERALS.filter(m => (breakdown[m.key] || 0) > 0)
  if (nonZero.length === 0) return null

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${compact ? "justify-center" : ""}`}>
      {nonZero.map(mineral => (
        <div key={mineral.key} className="flex items-center gap-0.5">
          <img src={mineral.image} alt="" className="w-3 h-3 object-contain flex-shrink-0" />
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {(breakdown[mineral.key] || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function LikesBreakdown({ breakdown, compact = false }) {
  if (!breakdown) return null

  const items = LIKES_BREAKDOWN_CONFIG.filter(item => (breakdown[item.key] || 0) > 0)
  if (items.length === 0) return null

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "justify-center" : ""}`}>
      {items.map(({ key, icon: Icon }) => (
        <div key={key} className="flex items-center gap-0.5">
          <Icon className="w-2.5 h-2.5 text-zinc-600" />
          <span className="text-[10px] text-zinc-500 tabular-nums">{breakdown[key]}</span>
        </div>
      ))}
    </div>
  )
}

function GlobalBreakdown({ breakdown, compact = false }) {
  if (!breakdown) return null

  const items = GLOBAL_BREAKDOWN_CONFIG.filter(item => {
    const val = breakdown[item.key]
    if (typeof val === "object") return (val?.raw || 0) > 0
    return (val || 0) > 0
  })
  if (items.length === 0) return null

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "justify-center" : ""}`}>
      {items.map(({ key, icon: Icon, color }) => {
        const val = breakdown[key]
        const raw = typeof val === "object" ? val?.raw || 0 : val || 0

        return (
          <div key={key} className="flex items-center gap-0.5">
            <Icon className={`w-2.5 h-2.5 ${color}`} />
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {raw.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function PlaytimeBreakdown({ breakdown, compact = false }) {
  if (!breakdown) return null

  const journal = breakdown.journal
  const steam = breakdown.steam

  const hasJournal = journal?.totalMinutes > 0
  const hasSteam = steam?.totalMinutes > 0

  if (!hasJournal && !hasSteam) return null

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "justify-center" : ""}`}>
      {hasJournal && (
        <div className="flex items-center gap-0.5">
          <BookOpen className="w-2.5 h-2.5 text-zinc-400" />
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {journal.hours}h {journal.minutes}m
          </span>
        </div>
      )}
      {hasSteam && (
        <div className="flex items-center gap-0.5">
          <SteamIcon className="w-2.5 h-2.5 text-zinc-400" />
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {steam.hours}h {steam.minutes}m
          </span>
        </div>
      )}
    </div>
  )
}

function EntryBreakdown({ entry, category, t, compact = false }) {
  const { breakdown, avgRating } = entry

  if (category === "global") return <GlobalBreakdown breakdown={breakdown} compact={compact} />
  if (category === "minerals") return <MineralBreakdown breakdown={breakdown} compact={compact} />
  if (category === "likes") return <LikesBreakdown breakdown={breakdown} compact={compact} />
  if (category === "playtime") return <PlaytimeBreakdown breakdown={breakdown} compact={compact} />

  if (category === "reviews" && avgRating > 0) {
    return (
      <div className={`flex items-center gap-1 ${compact ? "justify-center" : ""}`}>
        <Star className="w-2.5 h-2.5 text-zinc-400 fill-zinc-400" />
        <span className="text-[10px] text-zinc-500">
          {avgRating.toFixed(1)} {t("leaderboard.avgRating")}
        </span>
      </div>
    )
  }

  if (category === "followers") {
    return <span className="text-[10px] text-zinc-600">{t("leaderboard.followersLabel")}</span>
  }

  return null
}

function formatValue(entry, category) {
  if (category === "playtime") return `${entry.hours || 0}h ${entry.minutes || 0}m`
  if (category === "global") return `${(entry.value || 0).toLocaleString()} pts`
  return (entry.value || 0).toLocaleString()
}

function TopThreePodium({ entries, category, t }) {
  if (entries.length < 3) return null

  const ordered = [entries[1], entries[0], entries[2]]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
      {ordered.map((entry, idx) => {
        const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3
        const config = RANK_CONFIG[rank]
        const Icon = config.icon
        const isFirst = rank === 1

        return (
          <Link
            key={entry.user?.id || entry.rank}
            to={entry.user?.username ? `/u/${entry.user.username}` : "#"}
            className={`group relative p-3 sm:p-4 rounded-xl border-2 transition-all hover:scale-[1.02] bg-zinc-800/30 ${config.border} ${config.glow} ${
              isFirst ? "order-2" : rank === 2 ? "order-1 mt-4 sm:mt-6" : "order-3 mt-4 sm:mt-6"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-800/80 border ${config.border} flex items-center justify-center mb-2 sm:mb-3`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>

              <div className={isFirst ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20"}>
                <AvatarWithDecoration
                  src={entry.user?.avatar}
                  alt={entry.user?.username}
                  decorationUrl={entry.user?.equipped?.avatar_decoration?.asset_url}
                  size={isFirst ? "lg" : "md"}
                />
              </div>

              <div className="mt-2 sm:mt-3 w-full min-w-0">
                <span className={`block text-xs sm:text-sm font-semibold truncate ${isFirst ? "text-white" : "text-zinc-200"}`}>
                  {entry.user?.username || "Unknown"}
                </span>
              </div>

              <div className="mt-2 sm:mt-3">
                <span className={`text-base sm:text-xl font-bold tabular-nums ${config.color}`}>
                  {formatValue(entry, category)}
                </span>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5">
                  {t(`leaderboard.units.${category}`)}
                </p>
              </div>

              <div className="mt-2 w-full">
                <EntryBreakdown entry={entry} category={category} t={t} compact />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function LeaderboardEntry({ entry, category, t }) {
  const { rank, user } = entry

  return (
    <Link
      to={user?.username ? `/u/${user.username}` : "#"}
      className="group flex items-center gap-3 p-3 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:bg-zinc-800/40 hover:border-violet-500/20 transition-all"
    >
      <div className="w-6 flex-shrink-0 text-center">
        <span className="text-sm font-bold text-zinc-500 tabular-nums">{rank}</span>
      </div>

      <AvatarWithDecoration
        src={user?.avatar}
        alt={user?.username}
        decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors block">
          {user?.username || "Unknown"}
        </span>
        <div className="mt-0.5">
          <EntryBreakdown entry={entry} category={category} t={t} />
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <span className="text-sm font-bold text-white tabular-nums">
          {formatValue(entry, category)}
        </span>
      </div>
    </Link>
  )
}

function EmptyState({ category, t }) {
  const Icon = CATEGORIES.find(c => c.id === category)?.icon || Trophy

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-zinc-600" />
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">
        {t("leaderboard.empty.title")}
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs">
        {t("leaderboard.empty.description")}
      </p>
    </div>
  )
}

export default function LeaderboardPage() {
  const { t } = useTranslation()
  const [category, setCategory] = useState("global")
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showHint, setShowHint] = useState(false)

  usePageMeta({
    title: `${t("leaderboard.title")} - uloggd`,
    description: t("leaderboard.description"),
  })

  const fetchLeaderboard = useCallback(async (cat, pg) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ category: cat, page: pg, limit: 15 })
      const res = await fetch(`/api/stats/leaderboard?${params}`)
      const json = await res.json()

      setData(json.data || [])
      setTotalPages(json.totalPages || 1)
      setTotal(json.total || 0)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard(category, page)
  }, [category, page, fetchLeaderboard])

  function handleCategoryChange(cat) {
    setCategory(cat)
    setPage(1)
    setShowHint(false)
  }

  const topThree = data.slice(0, 3)
  const rest = data.slice(3)
  const showPodium = page === 1 && topThree.length === 3

  return (
    <div className="py-6 sm:py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t("leaderboard.title")}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500">
              {t("leaderboard.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHint(prev => !prev)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
              showHint
                ? "bg-violet-500/20 border-violet-500/30 text-violet-400"
                : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/10"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {!loading && total > 0 && (
            <div className="text-right hidden sm:block">
              <span className="text-lg font-bold text-white tabular-nums">
                {total.toLocaleString()}
              </span>
              <p className="text-xs text-zinc-500">{t("leaderboard.participants")}</p>
            </div>
          )}
        </div>
      </div>

      <CategoryTabs active={category} onChange={handleCategoryChange} t={t} />

      <div className="mt-6">
        {showHint && (
          <HintBox category={category} t={t} onClose={() => setShowHint(false)} />
        )}

        {loading ? (
          <LeaderboardSkeleton />
        ) : data.length === 0 ? (
          <EmptyState category={category} t={t} />
        ) : (
          <>
            {showPodium && <TopThreePodium entries={topThree} category={category} t={t} />}

            {(showPodium ? rest : data).length > 0 && (
              <div className="space-y-2">
                {(showPodium ? rest : data).map(entry => (
                  <LeaderboardEntry
                    key={entry.user?.id || entry.rank}
                    entry={entry}
                    category={category}
                    t={t}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}