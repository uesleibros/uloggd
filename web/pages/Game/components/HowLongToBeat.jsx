import { ExternalLink } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import CountUp from "@components/UI/CountUp"

function BarSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="h-4 w-20 bg-zinc-800/70 rounded-lg animate-pulse" />
        <div className="h-4 w-12 bg-zinc-800/70 rounded-lg animate-pulse" />
      </div>
      <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-zinc-700/50 animate-pulse w-3/4" />
      </div>
    </div>
  )
}

export function HowLongToBeat({ hltb, loading }) {
  const { t } = useTranslation("game")

  if (loading) {
    return (
      <div className="py-6 sm:py-8 border-t border-zinc-800/80">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">{t("hltb.title")}</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">{t("hltb.disclaimer")}</p>
        <div className="space-y-3">
          <BarSkeleton />
          <BarSkeleton />
          <BarSkeleton />
        </div>
      </div>
    )
  }

  const bars = hltb
    ? [
        { label: t("hltb.categories.main"), hours: hltb.times?.main, color: "bg-blue-500" },
        { label: t("hltb.categories.mainExtra"), hours: hltb.times?.mainExtra, color: "bg-purple-500" },
        { label: t("hltb.categories.completionist"), hours: hltb.times?.completionist, color: "bg-amber-500" },
      ].filter((b) => b.hours)
    : []

  if (!bars.length) {
    return (
      <div className="py-6 sm:py-8 border-t border-zinc-800/80">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">{t("hltb.title")}</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">{t("hltb.disclaimer")}</p>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <img className="h-10 w-10 object-contain select-none opacity-60" src="/problem.png" alt="" />
          <p className="text-sm text-zinc-500">{t("hltb.noData")}</p>
        </div>
      </div>
    )
  }

  const max = Math.max(...bars.map((b) => b.hours))

  return (
    <div className="py-6 sm:py-8 border-t border-zinc-800/80">
      <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">{t("hltb.title")}</h2>
      <p className="text-xs text-zinc-500 mt-1 mb-4">{t("hltb.disclaimerFull")}</p>
      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-zinc-400">{bar.label}</span>
              <span className="flex items-center text-sm font-semibold text-white tabular-nums">
                <CountUp end={Math.round(bar.hours)} />
                <span className="text-zinc-500 font-normal text-xs ml-0.5">{t("hltb.hours")}</span>
              </span>
            </div>
            <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                style={{ width: `${(bar.hours / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <a
        href={`https://howlongtobeat.com/game/${hltb.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-4 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        {t("hltb.source")}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}
