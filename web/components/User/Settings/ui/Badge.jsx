const COLORS = {
  zinc: "bg-zinc-800 text-zinc-400 border-zinc-700",
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
}

export default function Badge({ text, color = "zinc" }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${COLORS[color]}`}>
      {text}
    </span>
  )
}