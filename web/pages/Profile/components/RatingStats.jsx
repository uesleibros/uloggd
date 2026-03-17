import { useState, useEffect } from "react"
import { Star, BarChart3, Calendar, Target, Heart, MessageSquare, TrendingUp } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

const STATUS_CONFIG = {
  completed: { color: "bg-emerald-500", dot: "bg-emerald-400", ring: "ring-emerald-500/20" },
  played: { color: "bg-blue-500", dot: "bg-blue-400", ring: "ring-blue-500/20" },
  retired: { color: "bg-violet-500", dot: "bg-violet-400", ring: "ring-violet-500/20" },
  shelved: { color: "bg-amber-500", dot: "bg-amber-400", ring: "ring-amber-500/20" },
  abandoned: { color: "bg-red-500", dot: "bg-red-400", ring: "ring-red-500/20" },
}

function getTendency(average) {
  if (average >= 4.2) return { key: "generous", color: "text-green-400", bg: "bg-green-500/10", icon: "↑" }
  if (average >= 3.5) return { key: "positive", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: "↗" }
  if (average >= 2.5) return { key: "balanced", color: "text-blue-400", bg: "bg-blue-500/10", icon: "→" }
  if (average >= 1.5) return { key: "critical", color: "text-amber-400", bg: "bg-amber-500/10", icon: "↘" }
  return { key: "harsh", color: "text-red-400", bg: "bg-red-500/10", icon: "↓" }
}

function getMonthLabel(monthStr) {
  const [y, m] = monthStr.split("-")
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString(undefined, { month: "narrow" })
}

function StarRating({ rating }) {
  const percentage = (rating / 5) * 100

  return (
    <div className="relative h-3 flex items-center">
      <div className="flex gap-px">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3 h-3 text-zinc-700" />
        ))}
      </div>
      <div 
        className="absolute inset-y-0 left-0 flex gap-px overflow-hidden"
        style={{ width: `${percentage}%` }}
      >
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
        ))}
      </div>
    </div>
  )
}

function AverageDisplay({ average, tendency, t }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 rounded-lg">
      <div className="relative">
        <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-amber-500/20">
          <div className="text-center">
            <span className="text-lg font-bold text-white tabular-nums leading-none">
              {average.toFixed(1)}
            </span>
            <div className="text-[8px] text-zinc-500 -mt-0.5">/5</div>
          </div>
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${tendency.bg} flex items-center justify-center ring-2 ring-zinc-900`}>
          <span className={`text-[10px] ${tendency.color}`}>{tendency.icon}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <StarRating rating={average} />
        <span className={`inline-block mt-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${tendency.bg} ${tendency.color}`}>
          {t(`stats.tendency.${tendency.key}`)}
        </span>
      </div>
    </div>
  )
}

function DistributionBar({ rating, count, total, maxCount, isTop }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const barW = maxCount > 0 ? (count / maxCount) * 100 : 0

  return (
    <div className="group flex items-center gap-1.5 cursor-default">
      <div className="flex items-center gap-0.5 w-5 justify-end flex-shrink-0">
        <span className={`text-[10px] tabular-nums transition-colors ${
          isTop ? "text-amber-400 font-medium" : "text-zinc-500 group-hover:text-zinc-400"
        }`}>
          {rating}
        </span>
      </div>
      <div className="flex-1 h-2 bg-zinc-800/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isTop 
              ? "bg-gradient-to-r from-amber-500 to-amber-400" 
              : "bg-zinc-600 group-hover:bg-zinc-500"
          }`}
          style={{ width: `${barW}%` }}
        />
      </div>
      <div className="w-8 text-right">
        <span className={`text-[9px] tabular-nums transition-colors ${
          count > 0 ? "text-zinc-400" : "text-zinc-600"
        }`}>
          {count > 0 ? `${pct.toFixed(0)}%` : "-"}
        </span>
      </div>
    </div>
  )
}

function DistributionChart({ distribution, total, mode }) {
  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1, 0].map(rating => (
        <DistributionBar
          key={rating}
          rating={rating}
          count={distribution?.[rating] || 0}
          total={total}
          maxCount={maxCount}
          isTop={rating === mode && distribution?.[rating] > 0}
        />
      ))}
    </div>
  )
}

function MonthlyChart({ data }) {
  if (!data || data.length === 0) return null

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const hasData = data.some(d => d.count > 0)
  if (!hasData) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-zinc-600" />
          <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide">
            12 meses
          </span>
        </div>
        <span className="text-[9px] text-zinc-600 tabular-nums">{total} total</span>
      </div>

      <div className="flex items-end gap-[2px] h-10 px-0.5">
        {data.map((d, i) => {
          const barH = d.count > 0
            ? Math.max(Math.round((d.count / maxCount) * 40), 3)
            : 2

          return (
            <div
              key={i}
              className="flex-1 group cursor-default relative"
            >
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  d.count > 0
                    ? "bg-indigo-500/50 group-hover:bg-indigo-400/70"
                    : "bg-zinc-800/50"
                }`}
                style={{ height: barH }}
              />
              {d.count > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[8px] text-white tabular-nums opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {d.count}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-[2px] mt-1 px-0.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[7px] text-zinc-600 leading-none">
              {getMonthLabel(d.month)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBreakdown({ data, t }) {
  const entries = Object.entries(data || {})
    .filter(([_, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)

  if (entries.length === 0) return null

  const total = entries.reduce((sum, [_, v]) => sum + v.count, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-zinc-600" />
          <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide">
            Status
          </span>
        </div>
      </div>

      <div className="h-2 rounded-full overflow-hidden flex bg-zinc-800/50">
        {entries.map(([status, { count }], i) => {
          const width = (count / total) * 100
          const config = STATUS_CONFIG[status] || { color: "bg-zinc-600" }
          return (
            <div
              key={status}
              className={`${config.color} transition-all duration-500 ${i === 0 ? "rounded-l-full" : ""} ${i === entries.length - 1 ? "rounded-r-full" : ""}`}
              style={{ width: `${width}%` }}
            />
          )
        })}
      </div>

      <div className="mt-2 space-y-1">
        {entries.slice(0, 3).map(([status, { count, average }]) => {
          const config = STATUS_CONFIG[status] || { dot: "bg-zinc-500" }
          return (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                <span className="text-[10px] text-zinc-400">{t(`stats.status.${status}`)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500 tabular-nums">{count}</span>
                <span className="text-[9px] text-amber-400/70 tabular-nums">{average.toFixed(1)}★</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickStats({ mode, liked, reviewed, t }) {
  const stats = [
    { icon: Star, value: mode, label: t("stats.mostGiven"), color: "text-amber-400", fill: true },
    { icon: Heart, value: liked, label: t("stats.liked"), color: "text-red-400", fill: true },
    { icon: MessageSquare, value: reviewed, label: t("stats.withReview"), color: "text-blue-400", fill: false },
  ]

  return (
    <div className="grid grid-cols-3 gap-1">
      {stats.map(({ icon: Icon, value, label, color, fill }) => (
        <div key={label} className="text-center py-2 px-1 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors cursor-default">
          <div className="flex items-center justify-center gap-0.5">
            <Icon className={`w-3 h-3 ${color} ${fill ? "fill-current" : ""}`} />
            <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
          </div>
          <p className="text-[8px] text-zinc-600 mt-0.5 truncate">{label}</p>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ t }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-800/50 flex items-center justify-center mb-3 ring-1 ring-zinc-700/50">
        <TrendingUp className="w-5 h-5 text-zinc-600" />
      </div>
      <p className="text-xs text-zinc-500">{t("stats.noRatings")}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{t("stats.noRatingsHint")}</p>
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
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700/50">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-zinc-700 rounded animate-pulse" />
            <div className="w-20 h-3 bg-zinc-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="h-14 bg-zinc-800/50 rounded-lg animate-pulse" />
          <div className="space-y-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-2 bg-zinc-800/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const isEmpty = !stats.total || stats.total === 0
  const tendency = getTendency(stats.average || 0)
  const hasMonthly = stats.byMonth?.some(m => m.count > 0)
  const hasStatus = stats.byStatus && Object.values(stats.byStatus).some(v => v.count > 0)

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
              {t("stats.ratings")}
            </h3>
          </div>
          {!isEmpty && (
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {stats.total} {t("stats.rated")}
            </span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState t={t} />
      ) : (
        <div className="p-4 space-y-4">
          <AverageDisplay average={stats.average} tendency={tendency} t={t} />
          
          <DistributionChart 
            distribution={stats.distribution} 
            total={stats.total} 
            mode={stats.mode}
          />

          {hasMonthly && (
            <div className="pt-3 border-t border-zinc-800/80">
              <MonthlyChart data={stats.byMonth} />
            </div>
          )}

          {hasStatus && (
            <div className="pt-3 border-t border-zinc-800/80">
              <StatusBreakdown data={stats.byStatus} t={t} />
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800/80">
            <QuickStats 
              mode={stats.mode} 
              liked={stats.liked} 
              reviewed={stats.reviewed} 
              t={t} 
            />
          </div>
        </div>
      )}
    </div>
  )
}
