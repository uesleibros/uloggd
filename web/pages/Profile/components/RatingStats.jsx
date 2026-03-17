import { useState, useEffect } from "react"
import { Star, BarChart3, Calendar, Target, Heart, MessageSquare } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

const STATUS_COLORS = {
  completed: "bg-emerald-500",
  played: "bg-blue-500",
  retired: "bg-violet-500",
  shelved: "bg-amber-500",
  abandoned: "bg-red-500",
}

const STATUS_DOTS = {
  completed: "bg-emerald-400",
  played: "bg-blue-400",
  retired: "bg-violet-400",
  shelved: "bg-amber-400",
  abandoned: "bg-red-400",
}

function getTendency(average) {
  if (average >= 4.2) return { key: "generous", bg: "bg-green-500/10", text: "text-green-400" }
  if (average >= 3.5) return { key: "positive", bg: "bg-emerald-500/10", text: "text-emerald-400" }
  if (average >= 2.5) return { key: "balanced", bg: "bg-blue-500/10", text: "text-blue-400" }
  if (average >= 1.5) return { key: "critical", bg: "bg-amber-500/10", text: "text-amber-400" }
  return { key: "harsh", bg: "bg-red-500/10", text: "text-red-400" }
}

function getMonthLabel(monthStr) {
  const [y, m] = monthStr.split("-")
  return new Date(parseInt(y), parseInt(m) - 1)
    .toLocaleString(undefined, { month: "short" })
    .slice(0, 3)
}

function StarDisplay({ rating }) {
  const full = Math.floor(rating)
  const dec = rating - full
  const half = dec >= 0.25 && dec < 0.75
  const extra = dec >= 0.75
  const filled = extra ? full + 1 : full

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        if (i < filled) return <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        if (i === filled && half) {
          return (
            <div key={i} className="relative w-3.5 h-3.5">
              <Star className="absolute inset-0 w-3.5 h-3.5 text-zinc-700" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
            </div>
          )
        }
        return <Star key={i} className="w-3.5 h-3.5 text-zinc-700" />
      })}
    </div>
  )
}

function DistributionChart({ distribution, total }) {
  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1, 0].map(rating => {
        const count = distribution[rating] || 0
        const pct = total > 0 ? (count / total) * 100 : 0
        const barW = maxCount > 0 ? (count / maxCount) * 100 : 0

        return (
          <div key={rating} className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 w-8 justify-end flex-shrink-0">
              <span className="text-xs text-zinc-400 tabular-nums">{rating}</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${barW}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500 tabular-nums w-14 text-right">
              {count} ({pct.toFixed(0)}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyChart({ data, t }) {
  if (!data || data.length === 0) return null

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const hasData = data.some(d => d.count > 0)
  if (!hasData) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          {t("stats.monthlyActivity")}
        </span>
      </div>

      <div className="flex gap-[3px]" style={{ height: 80 }}>
        {data.map((d, i) => {
          const barH = d.count > 0
            ? Math.max(Math.round((d.count / maxCount) * 80), 4)
            : 0

          return (
            <div key={i} className="flex-1 flex flex-col justify-end group">
              <div
                className={`rounded-t-sm transition-all duration-500 cursor-default relative ${
                  d.count > 0
                    ? "bg-indigo-500/60 group-hover:bg-indigo-400/80"
                    : "bg-zinc-800/30"
                }`}
                style={{ height: d.count > 0 ? barH : 2 }}
              >
                {d.count > 0 && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap pointer-events-none">
                    {d.count}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-[3px] mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-zinc-600 leading-none">
              {getMonthLabel(d.month)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBreakdown({ data, t }) {
  const entries = Object.entries(data)
    .filter(([_, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)

  if (entries.length === 0) return null

  const maxCount = Math.max(...entries.map(([_, v]) => v.count), 1)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          {t("stats.byStatus")}
        </span>
      </div>

      <div className="space-y-2.5">
        {entries.map(([status, { count, average }]) => (
          <div key={status}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOTS[status] || "bg-zinc-500"}`} />
                <span className="text-xs text-zinc-300">{t(`stats.status.${status}`)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 tabular-nums">{count}</span>
                <span className="text-[11px] text-zinc-400 tabular-nums">{average.toFixed(1)}★</span>
              </div>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${STATUS_COLORS[status] || "bg-zinc-600"}`}
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RatingStats({ userId }) {
  const { t } = useTranslation("profile")
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/stats/ratings?userId=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse" />
            <div className="w-24 h-3 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="w-16 h-3 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-44 h-28 bg-zinc-800/30 rounded-xl animate-pulse" />
          <div className="flex-1 h-44 bg-zinc-800/30 rounded-xl animate-pulse" />
        </div>
        <div className="h-28 bg-zinc-800/30 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!stats || stats.total === 0) return null

  const tendency = getTendency(stats.average)
  const hasMonthly = stats.byMonth?.some(m => m.count > 0)
  const hasStatus = stats.byStatus && Object.values(stats.byStatus).some(v => v.count > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            {t("stats.ratings")}
          </h2>
        </div>
        <span className="text-xs text-zinc-600">
          {stats.total} {t("stats.rated")}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-44 flex-shrink-0 p-4 bg-zinc-800/30 rounded-xl flex flex-col justify-center">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
                {stats.average.toFixed(1)}
              </span>
              <span className="text-base text-zinc-600 font-medium">/ 5</span>
            </div>
            <div className="mt-1.5">
              <StarDisplay rating={stats.average} />
            </div>
            <div className="mt-3">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${tendency.bg} ${tendency.text}`}>
                {t(`stats.tendency.${tendency.key}`)}
              </span>
            </div>
          </div>

          <div className="flex-1 p-4 bg-zinc-800/30 rounded-xl">
            <DistributionChart distribution={stats.distribution} total={stats.total} />
          </div>
        </div>

        {hasMonthly && (
          <div className="p-4 bg-zinc-800/30 rounded-xl">
            <MonthlyChart data={stats.byMonth} t={t} />
          </div>
        )}

        {hasStatus && (
          <div className="p-4 bg-zinc-800/30 rounded-xl">
            <StatusBreakdown data={stats.byStatus} t={t} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-zinc-800/30 rounded-xl text-center">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-base font-bold text-white tabular-nums">{stats.mode}</span>
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">{t("stats.mostGiven")}</p>
          </div>
          <div className="p-3 bg-zinc-800/30 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              <span className="text-base font-bold text-white tabular-nums">{stats.liked}</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">{t("stats.liked")}</p>
          </div>
          <div className="p-3 bg-zinc-800/30 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-base font-bold text-white tabular-nums">{stats.reviewed}</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">{t("stats.withReview")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
