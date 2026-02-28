import { ExternalLink } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import CountUp from "@components/UI/CountUp"

export function HowLongToBeat({ hltb, loading }) {
  const { t } = useTranslation("game")

  if (loading) {
    return (
      <div>
        <hr className="my-6 border-zinc-700" />
        <h2 className="text-lg font-semibold text-white">{t("hltb.title")}</h2>
        <p className="text-xs text-zinc-500 mb-4">
          {t("hltb.disclaimer")}
        </p>
        <div className="space-y-2.5">
          {[75, 90, 100].map((w, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-10 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-zinc-700 animate-pulse"
                  style={{ width: `${w}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse mt-4" />
      </div>
    )
  }

  const bars = hltb
    ? [
        {
          label: t("hltb.categories.main"),
          hours: hltb.times?.main,
          color: "bg-blue-500",
          hoverColor: "group-hover:bg-blue-400",
        },
        {
          label: t("hltb.categories.mainExtra"),
          hours: hltb.times?.mainExtra,
          color: "bg-purple-500",
          hoverColor: "group-hover:bg-purple-400",
        },
        {
          label: t("hltb.categories.completionist"),
          hours: hltb.times?.completionist,
          color: "bg-amber-500",
          hoverColor: "group-hover:bg-amber-400",
        },
      ].filter((b) => b.hours)
    : []

  if (!bars.length) {
    return (
      <div>
        <hr className="my-6 border-zinc-700" />
        <h2 className="text-lg font-semibold text-white">{t("hltb.title")}</h2>
        <p className="text-xs text-zinc-500 mb-4">
          {t("hltb.disclaimer")}
        </p>
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <img className="object-contain h-10 w-10 select-none" src="/problem.png" alt="" />
          <p className="text-sm text-zinc-500">{t("hltb.noData")}</p>
        </div>
      </div>
    )
  }

  const max = Math.max(...bars.map((b) => b.hours))

  return (
    <div>
      <hr className="my-6 border-zinc-700" />
      <h2 className="text-lg font-semibold text-white">{t("hltb.title")}</h2>
      <p className="text-xs text-zinc-500 mb-4">
        {t("hltb.disclaimerFull")}
      </p>
      <div className="space-y-2.5">
        {bars.map((bar) => (
          <div key={bar.label} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-zinc-400">{bar.label}</span>
              <span className="flex items-center text-sm font-semibold text-white tabular-nums">
                <CountUp end={Math.round(bar.hours)} />
                <span className="text-zinc-500 font-normal text-xs ml-0.5">{t("hltb.hours")}</span>
              </span>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${bar.color} ${bar.hoverColor} transition-all duration-500`}
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
