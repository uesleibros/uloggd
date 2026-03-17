import { useState, useEffect } from "react"
import { Star, TrendingUp, Heart, MessageSquare, Calendar, Target } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

const STATUS_COLORS = {
  completed: "bg-emerald-500",
  played: "bg-blue-500",
  retired: "bg-violet-500",
  shelved: "bg-amber-500",
  abandoned: "bg-red-500",
}

function getTendency(average) {
  if (average >= 4.2) return { key: "generous", color: "text-emerald-400" }
  if (average >= 3.5) return { key: "positive", color: "text-green-400" }
  if (average >= 2.5) return { key: "balanced", color: "text-zinc-400" }
  if (average >= 1.5) return { key: "critical", color: "text-amber-400" }
  return { key: "harsh", color: "text-red-400" }
}

function getMonthLabel(monthStr) {
  const [y, m] = monthStr.split("-")
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString(undefined, { month: "narrow" })
}

function StarRating({ rating }) {
  const full = Math.floor(rating)
  const dec = rating - full
  const half = dec >= 0.25 && dec < 0.75
  const extra = dec >= 0.75
  const filled = extra ? full + 1 : full

  return (
    <div className="flex items-center gap-px">
      {[...Array(5)].map((_, i) => {
        if (i < filled) {
          return <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
        }
        if (i === filled && half) {
          return (
            <div key={i} className="relative w-2.5 h-2.5">
              <Star className="absolute inset-0 w-2.5 h-2.5 text-zinc-700" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              </div>
            </div>
          )
        }
        return <Star key={i} className="w-2.5 h-2.5 text-zinc-700" />
      })}
    </div>
  )
}

function DistributionChart({ distribution, total, mode }) {
  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1, 0].map(rating => {
        const count = distribution?.[rating] || 0
        const pct = total > 0 ? (count / total) * 100 : 0
        const barW = maxCount > 0 ? (count / maxCount) * 100 : 0
        const isMode = rating === mode && count > 0

        return (
          <div key={rating} className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 w-6 flex-shrink-0 justify-end">
              <span className={`text-[9px] tabular-nums ${isMode ? "text-amber-400 font-medium" : "text-zinc-500"}`}>
                {rating}
              </span>
              <Star className={`w-2 h-2 flex-shrink-0 ${isMode ? "text-amber-400 fill-amber-400" : "text-zinc-600"}`} />
            </div>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden min-w-0">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isMode ? "bg-amber-400" : "bg-zinc-600"}`}
                style={{ width: `${barW}%` }}
              />
            </div>
            <span className={`text-[8px] tabular-nums flex-shrink-0 w-7 text-right ${count > 0 ? "text-zinc-500" : "text-zinc-700"}`}>
              {count > 0 ? `${pct.toFixed(0)}%` : "-"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyChart({ data }) {
  if (!data?.length) return null

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const hasData = data.some(d => d.count > 0)
  if (!hasData) return null

  return (
    <div>
      <div className="flex items-end gap-px h-10">
        {data.map((d, i) => {
          const barH = d.count > 0 ? Math.max((d.count / maxCount) * 40, 2) : 1

          return (
            <div key={i} className="flex-1 flex flex-col justify-end min-w-0">
              <div
                className={`w-full rounded-t-sm transition-all ${d.count > 0 ? "bg-indigo-500/60" : "bg-zinc-800/40"}`}
                style={{ height: barH }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-px mt-1">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[6px] text-zinc-600 truncate">
            {getMonthLabel(d.month)}
          </span>
        ))}
      </div>
    </div>
  )
}

function StatusList({ data, t }) {
  const entries = Object.entries(data || {})
    .filter(([_, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)

  if (!entries.length) return null

  const maxCount = Math.max(...entries.map(([_, v]) => v.count), 1)

  return (
    <div className="space-y-1.5">
      {entries.map(([status, { count, average }]) => (
        <div key={status}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[status] || "bg-zinc-500"}`} />
            <span className="text-[9px] text-zinc-400 flex-1 truncate min-w-0">
              {t(`stats.status.${status}`)}
            </span>
            <span className="text-[8px] text-zinc-500 tabular-nums flex-shrink-0">{count}</span>
            <span className="text-[8px] text-zinc-600 tabular-nums flex-shrink-0">{average.toFixed(1)}★</span>
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
  )
}

function QuickStats({ mode, liked, reviewed, t }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 min-w-0">
        <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-medium text-white tabular-nums">{mode}</span>
        <span className="text-[8px] text-zinc-600 truncate">{t("stats.mostGiven")}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <Heart className="w-2.5 h-2.5 text-red-400 fill-red-400" />
          <span className="text-[9px] text-zinc-400 tabular-nums">{liked}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <MessageSquare className="w-2.5 h-2.5 text-blue-400" />
          <span className="text-[9px] text-zinc-400 tabular-nums">{reviewed}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ t }) {
  return (
    <div className="py-6 text-center">
      <Star className="w-5 h-5 text-zinc-700 mx-auto mb-2" />
      <p className="text-[10px] text-zinc-500">{t("stats.noRatings")}</p>
      <p className="text-[9px] text-zinc-600 mt-0.5">{t("stats.noRatingsHint")}</p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3.5 h-3.5 bg-zinc-700 rounded animate-pulse" />
        <div className="w-16 h-2.5 bg-zinc-700 rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-6 bg-zinc-800 rounded animate-pulse" />
        <div className="flex-1 h-3 bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="space-y-1.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-1.5 bg-zinc-800 rounded animate-pulse" />
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

  if (loading) return <Skeleton />
  if (!stats) return null

  const isEmpty = !stats.total
  const tendency = getTendency(stats.average || 0)
  const hasMonthly = stats.byMonth?.some(m => m.count > 0)
  const hasStatus = stats.byStatus && Object.values(stats.byStatus).some(v => v.count > 0)

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 border-b border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
              {t("stats.ratings")}
            </span>
          </div>
          {!isEmpty && (
            <span className="text-[9px] text-zinc-500 tabular-nums">
              {stats.total} {t("stats.rated")}
            </span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState t={t} />
      ) : (
        <div className="p-3 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-semibold text-white tabular-nums leading-none">
                  {stats.average.toFixed(1)}
                </span>
                <span className="text-[9px] text-zinc-600">/5</span>
              </div>
              <div className="mt-1">
                <StarRating rating={stats.average} />
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <span className={`text-[9px] font-medium ${tendency.color}`}>
                {t(`stats.tendency.${tendency.key}`)}
              </span>
            </div>
          </div>

          <DistributionChart
            distribution={stats.distribution}
            total={stats.total}
            mode={stats.mode}
          />

          {hasMonthly && (
            <div className="pt-2.5 border-t border-zinc-800">
              <div className="flex items-center gap-1 mb-2">
                <Calendar className="w-2.5 h-2.5 text-zinc-600" />
                <span className="text-[8px] text-zinc-600 uppercase tracking-wide">
                  {t("stats.monthlyActivity")}
                </span>
              </div>
              <MonthlyChart data={stats.byMonth} />
            </div>
          )}

          {hasStatus && (
            <div className="pt-2.5 border-t border-zinc-800">
              <div className="flex items-center gap-1 mb-2">
                <Target className="w-2.5 h-2.5 text-zinc-600" />
                <span className="text-[8px] text-zinc-600 uppercase tracking-wide">
                  {t("stats.byStatus")}
                </span>
              </div>
              <StatusList data={stats.byStatus} t={t} />
            </div>
          )}

          <div className="pt-2.5 border-t border-zinc-800">
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
