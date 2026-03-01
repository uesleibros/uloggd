import CountUp from "@components/UI/CountUp"

export const MINERALS = [
  { key: "copper", color: "#B87333" },
  { key: "iron", color: "#A8A8A8" },
  { key: "gold", color: "#FFD700" },
  { key: "emerald", color: "#50C878" },
  { key: "diamond", color: "#B9F2FF" },
  { key: "ruby", color: "#E0115F" },
]

export function MineralRow({ mineral, amount, name, size = "md" }) {
  const sizes = {
    sm: {
      box: "w-2 h-2",
      text: "text-xs",
      gap: "gap-2",
      padding: "px-2 py-1.5",
    },
    md: {
      box: "w-3 h-3",
      text: "text-sm",
      gap: "gap-2.5",
      padding: "px-3 py-2",
    },
    lg: {
      box: "w-4 h-4",
      text: "text-sm",
      gap: "gap-3",
      padding: "px-4 py-3",
    },
  }

  const s = sizes[size] || sizes.md

  return (
    <div className={`flex items-center justify-between ${s.padding} rounded-lg hover:bg-zinc-800/50 transition-colors`}>
      <div className={`flex items-center ${s.gap}`}>
        <span
          className={`inline-block ${s.box} rounded-sm`}
          style={{ backgroundColor: mineral.color }}
        />
        <span className={`${s.text} text-zinc-300`}>{name}</span>
      </div>
      <span
        className={`${s.text} font-semibold tabular-nums`}
        style={{ color: mineral.color }}
      >
        <CountUp end={amount} />
      </span>
    </div>
  )
}