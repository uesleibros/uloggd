import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  Trophy, Gem, MessageSquare, Users, Heart,
  Crown, Medal, Award, ChevronLeft, ChevronRight,
  Star, List, LayoutGrid, Camera, Clock, Globe
} from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import DragScrollRow from "@components/UI/DragScrollRow"
import { MINERALS } from "@components/Minerals/MineralRow"

const CATEGORIES = [
  { id: "global", icon: Globe, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { id: "minerals", icon: Gem, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { id: "reviews", icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "followers", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "likes", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10" },
  { id: "playtime", icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10" },
]

const RANK_CONFIG = {
  1: { 
    icon: Crown, 
    color: "text-amber-400",
    iconBg: "bg-amber-500/20",
    cardBg: "bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent",
    border: "border-amber-500/30 hover:border-amber-500/50",
    ring: "ring-2 ring-amber-500/20",
    label: "1st"
  },
  2: { 
    icon: Medal, 
    color: "text-zinc-300",
    iconBg: "bg-zinc-400/20",
    cardBg: "bg-gradient-to-b from-zinc-400/10 via-zinc-400/5 to-transparent",
    border: "border-zinc-500/30 hover:border-zinc-400/50",
    ring: "ring-2 ring-zinc-500/20",
    label: "2nd"
  },
  3: { 
    icon: Award, 
    color: "text-amber-600",
    iconBg: "bg-amber-600/20",
    cardBg: "bg-gradient-to-b from-amber-600/10 via-amber-600/5 to-transparent",
    border: "border-amber-600/30 hover:border-amber-600/50",
    ring: "ring-2 ring-amber-600/20",
    label: "3rd"
  },
}

const GLOBAL_BREAKDOWN_CONFIG = [
  { key: "minerals", icon: Gem, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { key: "reviews", icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "followers", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "likes", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10" },
  { key: "playtime", icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10" },
]

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
        {[2, 1, 3].map((rank) => (
          <div 
            key={rank} 
            className={`p-4 sm:p-5 bg-zinc-800/40 rounded-2xl ${
              rank === 1 ? "order-2 sm:-mt-4" : rank === 2 ? "order-1 mt-6" : "order-3 mt-6"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-700/50 rounded-full animate-pulse" />
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-zinc-700/50 rounded-full animate-pulse" />
              <div className="space-y-2 w-full flex flex-col items-center">
                <div className="w-16 sm:w-20 h-4 bg-zinc-700/50 rounded animate-pulse" />
                <div className="w-12 sm:w-14 h-3 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="space-y-2">
        {[...Array(7)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-800/30 rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="w-8 h-6 bg-zinc-700/50 rounded" />
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-zinc-700/50 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="w-24 sm:w-32 h-4 bg-zinc-700/50 rounded" />
              <div className="w-16 sm:w-20 h-3 bg-zinc-800/50 rounded" />
            </div>
            <div className="w-14 sm:w-16 h-5 bg-zinc-700/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoryTabs({ active, onChange, t }) {
  return (
    <div className="border-b border-zinc-800/80">
      <DragScrollRow className="-mb-px">
        <nav className="flex gap-1 p-1 w-max">
          {CATEGORIES.map(({ id, icon: Icon, color }) => {
            const isActive = active === id

            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? `${color} bg-zinc-800/60` 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? color : "text-zinc-600 group-hover:text-zinc-400"}`} />
                <span>{t(`leaderboard.categories.${id}`)}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-current rounded-full translate-y-[calc(100%+0.25rem)]" />
                )}
              </button>
            )
          })}
        </nav>
      </DragScrollRow>
    </div>
  )
}

function formatValue(value, category, entry) {
  if (category === "playtime") {
    return `${entry.hours}h ${entry.minutes}m`
  }
  if (category === "global") {
    return `${value.toLocaleString()} pts`
  }
  return value.toLocaleString()
}

function TopThreePodium({ entries, category, t }) {
  if (entries.length < 3) return null

  const ordered = [entries[1], entries[0], entries[2]]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
      {ordered.map((entry, idx) => {
        const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3
        const config = RANK_CONFIG[rank]
        const Icon = config.icon
        const isFirst = rank === 1

        return (
          <Link
            key={entry.user?.id || rank}
            to={`/u/${entry.user?.username}`}
            className={`group relative flex flex-col items-center p-3 sm:p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${config.cardBg} ${config.border} ${
              isFirst ? "order-2 sm:-mt-4" : rank === 2 ? "order-1 mt-4 sm:mt-6" : "order-3 mt-4 sm:mt-6"
            }`}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${config.iconBg} flex items-center justify-center mb-2 sm:mb-3`}>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
            </div>

            <div className={`relative ${isFirst ? "w-14 h-14 sm:w-18 sm:h-18" : "w-12 h-12 sm:w-14 sm:h-14"}`}>
              <div className={`absolute inset-0 rounded-full ${config.ring} scale-110`} />
              <AvatarWithDecoration
                src={entry.user?.avatar}
                alt={entry.user?.username}
                decorationUrl={entry.user?.equipped?.avatar_decoration?.asset_url}
                size={isFirst ? "md" : "sm"}
              />
            </div>

            <div className="mt-3 sm:mt-4 w-full text-center min-w-0">
              <p className={`text-xs sm:text-sm font-semibold truncate ${isFirst ? "text-white" : "text-zinc-200"} group-hover:text-white transition-colors`}>
                {entry.user?.username || "Unknown"}
              </p>
              <div className="flex justify-center mt-1">
                <UserBadges user={entry.user} size="xs" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 text-center">
              <p className={`text-lg sm:text-2xl font-bold tabular-nums ${config.color}`}>
                {formatValue(entry.value, category, entry)}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 font-medium">
                {t(`leaderboard.units.${category}`)}
              </p>
            </div>

            <div className={`absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full ${config.iconBg} border-2 border-zinc-900 flex items-center justify-center`}>
              <span className={`text-[10px] sm:text-xs font-bold ${config.color}`}>{rank}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function RankBadge({ rank }) {
  const config = RANK_CONFIG[rank]
  
  if (config) {
    const Icon = config.icon
    return (
      <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
    )
  }

  return (
    <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-zinc-400 tabular-nums">{rank}</span>
    </div>
  )
}

function MineralBreakdown({ breakdown }) {
  const nonZero = MINERALS.filter(m => breakdown[m.key] > 0)
  if (nonZero.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {nonZero.map(mineral => (
        <div key={mineral.key} className="flex items-center gap-1 bg-zinc-800/40 rounded-full px-1.5 py-0.5">
          <img src={mineral.image} alt="" className="w-3 h-3 object-contain" />
          <span className="text-[10px] text-zinc-400 tabular-nums font-medium">
            {breakdown[mineral.key].toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function LikesBreakdown({ breakdown }) {
  const items = [
    { key: "reviews", icon: MessageSquare, color: "text-emerald-400" },
    { key: "lists", icon: List, color: "text-orange-400" },
    { key: "tierlists", icon: LayoutGrid, color: "text-violet-400" },
    { key: "screenshots", icon: Camera, color: "text-sky-400" },
  ].filter(item => breakdown[item.key] > 0)

  if (items.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map(({ key, icon: Icon, color }) => (
        <div key={key} className="flex items-center gap-1 bg-zinc-800/40 rounded-full px-1.5 py-0.5">
          <Icon className={`w-2.5 h-2.5 ${color}`} />
          <span className="text-[10px] text-zinc-400 tabular-nums font-medium">{breakdown[key]}</span>
        </div>
      ))}
    </div>
  )
}

function GlobalBreakdown({ breakdown }) {
  const maxScore = 100
  
  return (
    <div className="flex items-center gap-1.5">
      {GLOBAL_BREAKDOWN_CONFIG.map(({ key, icon: Icon, color, bg }) => {
        const score = breakdown[key] || 0
        const percentage = (score / maxScore) * 100
        
        return (
          <div 
            key={key} 
            className="group relative flex items-center gap-1 bg-zinc-800/40 rounded-full px-1.5 py-0.5 cursor-default"
            title={`${key}: ${score} pts`}
          >
            <Icon className={`w-2.5 h-2.5 ${color}`} />
            <span className="text-[10px] text-zinc-400 tabular-nums font-medium">
              {Math.round(score)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LeaderboardEntry({ entry, category, t, index }) {
  const { rank, user, value, breakdown, avgRating, hours, minutes, entries: journeyEntries } = entry
  const isTopThree = rank <= 3

  return (
    <Link
      to={`/u/${user?.username}`}
      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all duration-200"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <RankBadge rank={rank} />

      <div className="relative">
        <AvatarWithDecoration
          src={user?.avatar}
          alt={user?.username}
          decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
          size="sm"
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
            {user?.username || "Unknown"}
          </span>
          <UserBadges user={user} size="xs" />
        </div>

        <div>
          {category === "global" && breakdown && (
            <GlobalBreakdown breakdown={breakdown} />
          )}
          {category === "minerals" && breakdown && (
            <MineralBreakdown breakdown={breakdown} />
          )}
          {category === "reviews" && avgRating !== undefined && avgRating !== null && (
            <div className="flex items-center gap-1.5 bg-zinc-800/40 rounded-full px-2 py-0.5 w-fit">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] text-zinc-400 font-medium">
                {avgRating} {t("leaderboard.avgRating")}
              </span>
            </div>
          )}
          {category === "likes" && breakdown && (
            <LikesBreakdown breakdown={breakdown} />
          )}
          {category === "followers" && (
            <div className="flex items-center gap-1.5 bg-zinc-800/40 rounded-full px-2 py-0.5 w-fit">
              <Users className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-zinc-400 font-medium">
                {t("leaderboard.followersLabel")}
              </span>
            </div>
          )}
          {category === "playtime" && journeyEntries !== undefined && (
            <div className="flex items-center gap-1.5 bg-zinc-800/40 rounded-full px-2 py-0.5 w-fit">
              <Clock className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-zinc-400 font-medium">
                {journeyEntries} {t("leaderboard.journeyEntries")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <span className={`text-sm sm:text-base font-bold tabular-nums ${isTopThree ? RANK_CONFIG[rank]?.color : "text-white"}`}>
          {formatValue(value, category, entry)}
        </span>
      </div>
    </Link>
  )
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const getPages = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (page <= 3) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i)
    } else if (page >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
    } else {
      for (let i = page - 2; i <= page + 2; i++) pages.push(i)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-zinc-800/50 disabled:hover:border-zinc-700/50 disabled:hover:text-zinc-400 transition-all duration-200 cursor-pointer flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex gap-1">
        {getPages().map(pageNum => (
          <button
            key={pageNum}
            onClick={() => onChange(pageNum)}
            className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              page === pageNum
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600"
            }`}
          >
            {pageNum}
          </button>
        ))}
      </div>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-zinc-800/50 disabled:hover:border-zinc-700/50 disabled:hover:text-zinc-400 transition-all duration-200 cursor-pointer flex items-center justify-center"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

function EmptyState({ category, t }) {
  const categoryConfig = CATEGORIES.find(c => c.id === category)
  const Icon = categoryConfig?.icon || Trophy
  const color = categoryConfig?.color || "text-zinc-400"

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
      <div className={`w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-5`}>
        <Icon className={`w-9 h-9 ${color} opacity-50`} />
      </div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-2">
        {t("leaderboard.empty.title")}
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
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
  }

  const topThree = data.slice(0, 3)
  const rest = data.slice(3)
  const showPodium = page === 1 && topThree.length === 3
  const categoryConfig = CATEGORIES.find(c => c.id === category)

  return (
    <div className="py-6 sm:py-10 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${categoryConfig?.bg || "bg-indigo-500/10"} border border-zinc-800 flex items-center justify-center`}>
            <Trophy className={`w-6 h-6 ${categoryConfig?.color || "text-indigo-400"}`} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {t("leaderboard.title")}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {t("leaderboard.subtitle")}
            </p>
          </div>
        </div>
        
        {!loading && total > 0 && (
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-bold text-white tabular-nums">
              {total.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 font-medium">{t("leaderboard.participants")}</p>
          </div>
        )}
      </header>

      <CategoryTabs active={category} onChange={handleCategoryChange} t={t} />

      <div className="mt-8">
        {loading ? (
          <LeaderboardSkeleton />
        ) : data.length === 0 ? (
          <EmptyState category={category} t={t} />
        ) : (
          <div className="animate-in fade-in duration-300">
            {showPodium && (
              <TopThreePodium entries={topThree} category={category} t={t} />
            )}

            {(showPodium ? rest : data).length > 0 && (
              <div className="space-y-2">
                {(showPodium ? rest : data).map((entry, index) => (
                  <LeaderboardEntry
                    key={entry.user?.id || entry.rank}
                    entry={entry}
                    category={category}
                    t={t}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>
    </div>
  )
}
