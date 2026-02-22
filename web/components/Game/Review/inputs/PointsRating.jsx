import { X } from "lucide-react"
import { formatRating, toRatingValue, ratingSteps } from "#utils/rating"

export function PointsRatingInput({ value, onChange, mode, compact = false }) {
  const config = ratingSteps(mode)
  const displayValue = value != null ? formatRating(value, mode)?.display ?? "" : ""

  function handleChange(e) {
    const raw = parseFloat(e.target.value)
    if (isNaN(raw)) {
      onChange(null)
      return
    }
    const clamped = Math.min(Math.max(raw, config.min), config.max)
    onChange(toRatingValue(clamped, mode))
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode={mode === "points_10d" ? "decimal" : "numeric"}
        value={displayValue}
        onChange={handleChange}
        min={config.min}
        max={config.max}
        step={config.step}
        placeholder="—"
        className={`bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
          compact ? "w-16 px-2 py-2 text-sm" : "w-20 px-3 py-2.5 text-sm"
        }`}
      />
      <span className={compact ? "text-xs text-zinc-600" : "text-sm text-zinc-500"}>/ {config.max}</span>
      {value != null && value > 0 && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="cursor-pointer text-zinc-600 hover:text-zinc-400 transition-colors p-2 -m-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}