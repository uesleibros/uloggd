import { useState, useEffect } from "react"
import { Star, TrendingUp, Heart, MessageSquare } from "lucide-react"
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
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => {
        if (i < filled) {
          return <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
        }
        if (i === filled && half) {
          return (
            <div key={i} className="relative w-3 h-3">
              <Star className="absolute inset-0 w-3 h-3 text-zinc-700" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              </div>
            </div>
          )
        }
        return <Star key={i} className="w-3 h-3 text-zinc-700" />
      })}
    </div>
  )
}

function DistributionChart({ distribution, total, mode }) {
  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1, 0].map(rating => {
        const count = distribution?.[rating] || 0
        const barW = maxCount > 0 ? (count / maxCount) * 100 : 0
        const isMode = rating === mode && count > 0

        return (
          <div key={rating} className="flex items-center gap-2">
            <span className={`text-[10px] w-2 text-right tabular-nums ${isMode ? "text-amber-400 font-medium" : "text-zinc-500"}`}>
              {rating}
            </span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isMode ? "bg-amber-400" : "bg-zinc-600"}`}
                style={{ width: `${barW}%` }}
              />
            </div>
            <span className="text-[9px] w-4 text-right tabular-nums text-zinc-600">
              {count || "-"}
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
      <div className="flex items-end gap-px h-8">
        {data.map((d, i) => {
          const barH = d.count > 0 ? Math.max((d.count / maxCount) * 32, 2) : 1

          return (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className={`w-full rounded-sm transition-all ${d.count > 0 ? "bg-indigo-500/60" : "bg-zinc-800/40"}`}
                style={{ height: barH }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-px mt-1">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[7px] text-zinc-600">
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
    .slice(0, 3)

  if (!entries.length) return null

  const total = entries.reduce((sum, [_, v]) => sum + v.count, 0)

  return (
    <div className="space-y-1.5">
      {entries.map(([status, { count, average }]) => {
        const pct = (count / total) * 100

        return (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-1 h-1 rounded-full ${STATUS_COLORS[status] || "bg-zinc-500"}`} />
            <span className="text-[10px] text-zinc-400 flex-1 truncate">
              {t(`stats.status.${status}`)}
            </span>
            <span className="text-[9px] text-zinc-500 tabular-nums">
              {pct.toFixed(0)}%
            </span>
            <span className="text-[9px] text-zinc-600 tabular-nums w-6 text-right">
              {average.toFixed(1)}★
            </span>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ t }) {
  return (
    <div className="py-8 text-center">
      <Star className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
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
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse" />
          <div className="w-20 h-3 bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-1.5 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const isEmpty = !stats.total
  const tendency = getTendency(stats.average || 0)
  const hasMonthly = stats.byMonth?.some(m => m.count > 0)
  const hasStatus = stats.byStatus && Object.values(stats.byStatus).some(v => v.count > 0)

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400">
              {t("stats.ratings")}
            </span>
          </div>
          {!isEmpty && (
            <span className="text-[10px] text-zinc-600">{stats.total}</span>
          )}
        </div>

        {isEmpty ? (
          <EmptyState t={t} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-white tabular-nums">
                    {stats.average.toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-600">/5</span>
                </div>
                <div className="mt-1">
                  <StarRating rating={stats.average} />
                </div>
              </div>
              <div className="flex-1">
                <span className={`text-[10px] ${tendency.color}`}>
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
              <div className="pt-3 border-t border-zinc-800">
                <span className="text-[9px] text-zinc-600 uppercase tracking-wide">
                  {t("stats.monthlyActivity")}
                </span>
                <div className="mt-2">
                  <MonthlyChart data={stats.byMonth} />
                </div>
              </div>
            )}

            {hasStatus && (
              <div className="pt-3 border-t border-zinc-800">
                <span className="text-[9px] text-zinc-600 uppercase tracking-wide">
                  {t("stats.byStatus")}
                </span>
                <div className="mt-2">
                  <StatusList data={stats.byStatus} t={t} />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="w-3 h-3 text-zinc-600" />
                    <span className="text-xs font-medium text-white tabular-nums">{stats.liked}</span>
                  </div>
                  <span className="text-[8px] text-zinc-600">{t("stats.liked")}</span>
                </div>
                <div className="w-px h-6 bg-zinc-800" />
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare className="w-3 h-3 text-zinc-600" />
                    <span className="text-xs font-medium text-white tabular-nums">{stats.reviewed}</span>
                  </div>
                  <span className="text-[8px] text-zinc-600">{t("stats.withReview")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
