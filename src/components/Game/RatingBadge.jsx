export default function RatingBadge({ score, label, size = "lg" }) {
  score = Math.round(score)
  if (!score) return null

  const color = score >= 75
    ? "bg-green-600 text-white"
    : score >= 50
    ? "bg-yellow-500 text-black"
    : "bg-red-600 text-white"

  const sizes = {
    sm: "px-1.5 py-0.5 text-xs",
    lg: "px-3 py-1.5 text-lg"
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-bold rounded ${color} ${sizes[size]}`}>
        {score}
      </span>
      {label && <span className="text-xs text-zinc-500">{label}</span>}
    </div>
  )
}