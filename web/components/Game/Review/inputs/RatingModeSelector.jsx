import { useTranslation } from "#hooks/useTranslation"
import { RATING_MODES } from "../constants"

export function RatingModeSelector({ mode, setMode, compact = false }) {
  const { t } = useTranslation("review.ratingModes")

  return (
    <div className="flex flex-wrap gap-1.5">
      {RATING_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`rounded-lg font-medium cursor-pointer transition-all duration-200 ${
            compact ? "px-2.5 py-1.5 text-[11px]" : "px-2.5 py-1.5 text-xs"
          } ${
            mode === m.id
              ? "bg-white text-black"
              : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600"
          }`}
        >
          {compact ? t(`${m.id}.label`) : t(`${m.id}.labelFull`)}
        </button>
      ))}
    </div>
  )
}
