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
    <div className="flex items-center gap-0.5">
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

function AverageCard({ average, tendency, t }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
      <div className="flex-shrink-0">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-bold text-white tabular-nums leading-none">
            {average.toFixed(1)}
          </span>
          <span className="text-[10px] text-zinc-500">/5</span>
        </div>
        <div className="mt-1.5">
          <StarRating rating={average} />
        </div>
      </div>
      <div className="h-8 w-px bg-zinc-700/50 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[9px] text-zinc-500 uppercase tracking-wide">
          {t("stats.tendency.label")}
        </span>
        <p className={`text-xs font-medium mt-0.5 ${tendency.color}`}>
          {t(`stats.tendency.${tendency.key}`)}
        </p>
      </div>
    </div>
  )
}

function DistributionChart({ distribution, total, mode }) {
  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1, 0].map(rating => {
        const count = distribution?.[rating] || 0
        const pct = total > 0 ? (count / total) * 100 : 0
        const barW = maxCount > 0 ? (count / maxCount) * 100 : 0
        const isMode = rating === mode && count > 0

        return (
          <div key={rating} className="flex items-center gap-2">
            <div className="w-4 flex-shrink-0 text-right">
              <span className={`text-[10px] tabular-nums ${isMode ? "text-amber-400 font-semibold" : "text-zinc-500"}`}>
                {rating}★
              </span>
            </div>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden min-w-0">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isMode ? "bg-amber-400" : "bg-zinc-600"}`}
                style={{ width: `${barW}%` }}
              />
            </div>
            <div className="w-8 flex-shrink-0 text-right">
              <span className={`text-[9px] tabular-nums ${count > 0 ? "text-zinc-400" : "text-zinc-600"}`}>
                {count > 0 ? `${pct.toFixed(0)}%` : "-"}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyChart({ data, t }) {
  if (!data?.length) return null

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const hasData = data.some(d => d.count > 0)
  if (!hasData) return null

  const totalCount = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-zinc-500" />
          <span className="text-[9px] text-zinc-500 uppercase tracking-wide font-medium">
            {t("stats.monthlyActivity")}
          </span>
        </div>
        <span className="text-[9px] text-zinc-600 tabular-nums">
          {totalCount}
        </span>
      </div>

      <div className="flex items-end gap-0.5 h-12 px-1">
        {data.map((d, i) => {
          const barH = d.count > 0 ? Math.max((d.count / maxCount) * 100, 8) : 4

          return (
            <div key={i} className="flex-1 flex flex-col justify-end min-w-0 group">
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  d.count > 0 
                    ? "bg-indigo-500/70 group-hover:bg-indigo-400" 
                    : "bg-zinc-800"
                }`}
                style={{ height: `${barH}%` }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-0.5 mt-1.5 px-1">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[7px] text-zinc-600 truncate">
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
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Target className="w-3 h-3 text-zinc-500" />
        <span className="text-[9px] text-zinc-500 uppercase tracking-wide font-medium">
          {t("stats.byStatus")}
        </span>
      </div>

      <div className="space-y-2">
        {entries.map(([status, { count, average }]) => (
          <div key={status}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[status] || "bg-zinc-500"}`} />
              <span className="text-[10px] text-zinc-300 flex-1 truncate min-w-0">
                {t(`stats.status.${status}`)}
              </span>
              <span className="text-[9px] text-zinc-500 tabular-nums flex-shrink-0">
                {count}
              </span>
              <span className="text-[9px] text-amber-400/70 tabular-nums flex-shrink-0">
                {average.toFixed(1)}★
              </span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden ml-4">
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

function QuickStats({ mode, liked, reviewed, t }) {
  const items = [
    {
      icon: Star,
      value: mode,
      label: t("stats.mostGiven"),
      iconClass: "text-amber-400 fill-amber-400",
    },
    {
      icon: Heart,
      value: liked,
      label: t("stats.liked"),
      iconClass: "text-red-400 fill-red-400",
    },
    {
      icon: MessageSquare,
      value: reviewed,
      label: t("stats.withReview"),
      iconClass: "text-blue-400",
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ icon: Icon, value, label, iconClass }) => (
        <div key={label} className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Icon className={`w-3 h-3 flex-shrink-0 ${iconClass}`} />
            <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
          </div>
          <p className="text-[8px] text-zinc-500 mt-0.5 truncate">{label}</p>
        </div>
      ))}
    </div>
  )
}

function SectionDivider() {
  return <div className="h-px bg-zinc-800/80" />
}

function EmptyState({ t }) {
  return (
    <div className="py-8 text-center">
      <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto mb-3">
        <Star className="w-5 h-5 text-zinc-600" />
      </div>
      <p className="text-xs text-zinc-400">{t("stats.noRatings")}</p>
      <p className="text-[10px] text-zinc-600 mt-1">{t("stats.noRatingsHint")}</p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse" />
          <div className="w-20 h-3 bg-zinc-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-2 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
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
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <h3 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
              {t("stats.ratings")}
            </h3>
          </div>
          {!isEmpty && (
            <span className="text-[10px] text-zinc-500">
              {stats.total} {t("stats.rated")}
            </span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState t={t} />
      ) : (
        <div className="p-4 space-y-4">
          <AverageCard average={stats.average} tendency={tendency} t={t} />

          <DistributionChart
            distribution={stats.distribution}
            total={stats.total}
            mode={stats.mode}
          />

          {hasMonthly && (
            <>
              <SectionDivider />
              <MonthlyChart data={stats.byMonth} t={t} />
            </>
          )}

          {hasStatus && (
            <>
              <SectionDivider />
              <StatusList data={stats.byStatus} t={t} />
            </>
          )}

          <SectionDivider />
          <QuickStats
            mode={stats.mode}
            liked={stats.liked}
            reviewed={stats.reviewed}
            t={t}
          />
        </div>
      )}
    </div>
  )
}
