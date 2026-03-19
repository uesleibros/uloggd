import { useTranslation } from "#hooks/useTranslation"

const TYPE_CONFIG = {
  dlc: { color: "purple" },
  expansion: { color: "blue" },
  bundle: { color: "amber" },
  standalone: { color: "cyan" },
  mod: { color: "orange" },
  episode: { color: "teal" },
  season: { color: "teal" },
  remake: { color: "emerald" },
  remaster: { color: "emerald" },
  expanded: { color: "indigo" },
  port: { color: "slate" },
  fork: { color: "rose" },
  pack: { color: "amber" },
  update: { color: "zinc" },
}

const COLOR_STYLES = {
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  teal: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  slate: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  zinc: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

export default function GameTypeBadge({ type, className = "" }) {
  const { t } = useTranslation()

  if (!type || type === "main") return null

  const config = TYPE_CONFIG[type]
  if (!config) return null

  const colorStyle = COLOR_STYLES[config.color]

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded border flex-shrink-0 ${colorStyle} ${className}`}
    >
      {t(`game.type.${type}`)}
    </span>
  )
}

export function getGameTypeColor(type) {
  return TYPE_CONFIG[type]?.color || null
}
