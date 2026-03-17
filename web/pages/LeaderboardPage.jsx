import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  Trophy, Gem, MessageSquare, Users, Heart,
  Crown, Medal, Award, ChevronLeft, ChevronRight
} from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import DragScrollRow from "@components/UI/DragScrollRow"
import { MINERALS } from "@components/Minerals/MineralRow"

const CATEGORIES = [
  { id: "minerals", icon: Gem },
  { id: "reviews", icon: MessageSquare },
  { id: "followers", icon: Users },
  { id: "likes", icon: Heart },
]

const RANK_STYLES = {
  1: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  2: { icon: Medal, color: "text-zinc-300", bg: "bg-zinc-400/10", border: "border-zinc-400/30" },
  3: { icon: Award, color: "text-amber-600", bg: "bg-amber-700/10", border: "border-amber-600/30" },
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-zinc-800/30 rounded-xl animate-pulse">
          <div className="w-8 h-6 bg-zinc-700 rounded" />
          <div className="w-10 h-10 bg-zinc-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="w-32 h-4 bg-zinc-700 rounded" />
            <div className="w-20 h-3 bg-zinc-800 rounded" />
          </div>
          <div className="w-16 h-5 bg-zinc-700 rounded" />
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
                className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                />
                {t(`leaderboard.categories.${id}`)}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-indigo-500 rounded-t-full" />
                )}
              </button>
            )
          })}
        </nav>
      </DragScrollRow>
    </div>
  )
}

function RankBadge({ rank }) {
  const style = RANK_STYLES[rank]

  if (style) {
    const Icon = style.icon
    return (
      <div className={`w-8 h-8 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${style.color}`} />
      </div>
    )
  }

  return (
    <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center">
      <span className="text-sm font-bold text-zinc-500 tabular-nums">{rank}</span>
    </div>
  )
}

function MineralBreakdown({ breakdown }) {
  const nonZero = MINERALS.filter(m => breakdown[m.key] > 0)
  if (nonZero.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {nonZero.slice(0, 4).map(mineral => (
        <div key={mineral.key} className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: mineral.color }}
          />
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {breakdown[mineral.key].toLocaleString()}
          </span>
        </div>
      ))}
      {nonZero.length > 4 && (
        <span className="text-[10px] text-zinc-600">+{nonZero.length - 4}</span>
      )}
    </div>
  )
}

function LikesBreakdown({ breakdown, t }) {
  const items = [
    { key: "reviews", icon: MessageSquare },
    { key: "lists", icon: null, label: "L" },
    { key: "tierlists", icon: null, label: "T" },
    { key: "screenshots", icon: null, label: "S" },
  ].filter(item => breakdown[item.key] > 0)

  if (items.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {items.map(({ key, icon: Icon, label }) => (
        <div key={key} className="flex items-center gap-0.5">
          {Icon ? (
            <Icon className="w-3 h-3 text-zinc-600" />
          ) : (
            <span className="text-[9px] text-zinc-600 font-medium">{label}</span>
          )}
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {breakdown[key]}
          </span>
        </div>
      ))}
    </div>
  )
}

function LeaderboardEntry({ entry, category, t }) {
  const { rank, user, value, breakdown, avgRating } = entry
  const isTop3 = rank <= 3

  return (
    <Link
      to={`/u/${user?.username}`}
      className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${
        isTop3
          ? `${RANK_STYLES[rank]?.bg || "bg-zinc-800/30"} ${RANK_STYLES[rank]?.border || "border-zinc-700/50"} hover:border-zinc-600`
          : "bg-zinc-800/20 border-zinc-800/50 hover:bg-zinc-800/40 hover:border-zinc-700"
      }`}
    >
      <RankBadge rank={rank} />

      <AvatarWithDecoration
        src={user?.avatar}
        alt={user?.username}
        decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-semibold truncate ${isTop3 ? "text-white" : "text-zinc-200"}`}>
            {user?.username || "Unknown"}
          </span>
          <UserBadges user={user} size="xs" />
        </div>

        <div className="mt-0.5">
          {category === "minerals" && breakdown && (
            <MineralBreakdown breakdown={breakdown} />
          )}
          {category === "reviews" && avgRating && (
            <span className="text-[11px] text-amber-400/70">
              ★ {avgRating} {t("leaderboard.avgRating")}
            </span>
          )}
          {category === "likes" && breakdown && (
            <LikesBreakdown breakdown={breakdown} t={t} />
          )}
          {category === "followers" && (
            <span className="text-[11px] text-zinc-600">
              {t("leaderboard.followers")}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className={`text-base sm:text-lg font-bold tabular-nums ${isTop3 ? RANK_STYLES[rank]?.color : "text-white"}`}>
          {value.toLocaleString()}
        </div>
        <div className="text-[10px] text-zinc-600">
          {t(`leaderboard.units.${category}`)}
        </div>
      </div>
    </Link>
  )
}

function Pagination({ page, totalPages, onChange, t }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1">
        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
          let pageNum
          if (totalPages <= 5) {
            pageNum = i + 1
          } else if (page <= 3) {
            pageNum = i + 1
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i
          } else {
            pageNum = page - 2 + i
          }

          return (
            <button
              key={pageNum}
              onClick={() => onChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                page === pageNum
                  ? "bg-indigo-500 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {pageNum}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function EmptyState({ category, t }) {
  const Icon = CATEGORIES.find(c => c.id === category)?.icon || Trophy

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-600" />
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">
        {t("leaderboard.empty.title")}
      </h3>
      <p className="text-sm text-zinc-500">
        {t("leaderboard.empty.description")}
      </p>
    </div>
  )
}

export default function LeaderboardPage() {
  const { t } = useTranslation("common")
  const [category, setCategory] = useState("minerals")
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

  return (
    <div className="py-6 sm:py-10 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t("leaderboard.title")}
            </h1>
            <p className="text-sm text-zinc-500">
              {t("leaderboard.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <CategoryTabs active={category} onChange={handleCategoryChange} t={t} />

      <div className="mt-4">
        {!loading && total > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-500">
              {total.toLocaleString()} {t("leaderboard.participants")}
            </span>
          </div>
        )}

        {loading ? (
          <LeaderboardSkeleton />
        ) : data.length === 0 ? (
          <EmptyState category={category} t={t} />
        ) : (
          <div className="space-y-2">
            {data.map(entry => (
              <LeaderboardEntry
                key={entry.user?.id || entry.rank}
                entry={entry}
                category={category}
                t={t}
              />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          t={t}
        />
      </div>
    </div>
  )
}
