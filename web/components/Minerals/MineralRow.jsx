import { useTranslation } from "#hooks/useTranslation"

export const MINERALS = [
  { key: "copper", image: "/minerals/copper.png" },
  { key: "iron", image: "/minerals/iron.png" },
  { key: "gold", image: "/minerals/gold.png" },
  { key: "emerald", image: "/minerals/emerald.png" },
  { key: "diamond", image: "/minerals/diamond.png" },
  { key: "ruby", image: "/minerals/ruby.png" },
]

export function MineralRow({ mineral, amount, size = "md" }) {
  const { t } = useTranslation("minerals")

  const sizes = {
    sm: { img: "w-4 h-4", text: "text-xs", gap: "gap-2", padding: "px-2 py-1.5" },
    md: { img: "w-5 h-5", text: "text-sm", gap: "gap-2.5", padding: "px-3 py-2" },
    lg: { img: "w-6 h-6", text: "text-sm", gap: "gap-3", padding: "px-4 py-3" },
  }

  const s = sizes[size] || sizes.md

  return (
    <div className={`flex items-center justify-between ${s.padding} rounded-lg hover:bg-zinc-800/50 transition-colors`}>
      <div className={`flex items-center ${s.gap}`}>
        <img 
          src={mineral.image} 
          alt={t(`items.${mineral.key}.name`)}
          className={`${s.img} object-contain`}
        />
        <span className={`${s.text} text-zinc-300`}>{t(`items.${mineral.key}.name`)}</span>
      </div>
      <span className={`${s.text} font-semibold tabular-nums text-zinc-100`}>
        {amount.toLocaleString()}
      </span>
    </div>
  )
}
