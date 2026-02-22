import { ALERT_VARIANTS } from "../constants"

export function AlertBox({ type = "info", children }) {
  const variant = ALERT_VARIANTS[type] || ALERT_VARIANTS.info
  const Icon = variant.icon

  return (
    <div className={`my-6 rounded-xl border ${variant.border} ${variant.bg} overflow-hidden`}>
      <div className="flex gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/60 border border-white/5">
          <Icon className={`w-4 h-4 ${variant.color}`} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className={`text-sm font-semibold mb-1 ${variant.color}`}>{variant.label}</div>
          <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}
