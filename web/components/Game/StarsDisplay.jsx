import { Star } from "lucide-react"

export default function StarsDisplay({ rating, ratingMode, size = "md" }) {
  if (rating == null) return null

  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5"
  const raw = rating / 20
  const count = ratingMode === "stars_5" ? Math.round(raw) : Math.round(raw * 2) / 2
  const clamped = Math.min(Math.max(count, 0), 5)
  const full = Math.floor(clamped)
  const half = clamped % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f${i}`} className={`${sizeClass} text-amber-400 fill-current`} />
      ))}
      {half && (
        <div className={`relative ${sizeClass}`}>
          <Star className="absolute inset-0 w-full h-full text-zinc-700 fill-current" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className={`${sizeClass} text-amber-400 fill-current`} />
          </div>
        </div>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e${i}`} className={`${sizeClass} text-zinc-700 fill-current`} />
      ))}
    </div>
  )
}
