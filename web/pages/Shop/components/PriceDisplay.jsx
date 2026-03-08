import { MINERALS } from "@components/Minerals/MineralRow"

export default function PriceDisplay({ item, size = "md" }) {
  const prices = MINERALS
    .filter(m => (item[`price_${m.key}`] || 0) > 0)
    .map(m => ({ ...m, amount: item[`price_${m.key}`] }))

  if (prices.length === 0) {
    return <span className="text-xs text-emerald-400 font-medium">Free</span>
  }

  const isLg = size === "lg"

  return (
    <div className="flex items-center flex-wrap gap-2">
      {prices.map((p, i) => (
        <div key={p.key} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-600 text-xs mr-0.5">+</span>}
          <span
            className={`inline-block rounded-sm flex-shrink-0 ${isLg ? "w-3 h-3" : "w-2 h-2"}`}
            style={{ backgroundColor: p.color }}
          />
          <span
            className={`font-semibold tabular-nums ${isLg ? "text-sm" : "text-xs"}`}
            style={{ color: p.color }}
          >
            {p.amount.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}