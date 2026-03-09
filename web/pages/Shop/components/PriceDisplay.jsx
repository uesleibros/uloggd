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
          <img
            src={p.image}
            alt={p.key}
            className={`object-contain flex-shrink-0 ${isLg ? "w-4 h-4" : "w-3 h-3"}`}
          />
          <span className={`font-semibold tabular-nums text-zinc-100 ${isLg ? "text-sm" : "text-xs"}`}>
            {p.amount.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
