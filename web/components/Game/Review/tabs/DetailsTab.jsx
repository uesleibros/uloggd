import { useState } from "react"
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { ReviewSection } from "../shared/ReviewSection"
import { PlatformSelect } from "../inputs/PlatformSelect"
import { MAX_TITLE_LENGTH } from "../constants"

export function DetailsTab({
  reviewTitle, setReviewTitle,
  replay, setReplay,
  hoursPlayed, setHoursPlayed,
  minutesPlayed, setMinutesPlayed,
  playedPlatform, setPlayedPlatform,
  platforms,
  onDelete,
  deleting,
  isEditing,
}) {
  const { t } = useTranslation("review.details")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div className="space-y-4">
      <ReviewSection title={t("info.title")}>
        <div className="flex gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <label className="text-sm text-zinc-400 mb-1.5 block">{t("info.titleLabel")}</label>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder={t("info.titlePlaceholder")}
              maxLength={MAX_TITLE_LENGTH}
              className="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <p className="text-xs text-zinc-600 mt-1">{t("info.maxChars", { max: MAX_TITLE_LENGTH })}</p>
          </div>
          <div className="flex-shrink-0">
            <label className="text-sm text-zinc-400 mb-1.5 block">{t("info.replay")}</label>
            <button
              type="button"
              onClick={() => setReplay(!replay)}
              className={`w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${
                replay
                  ? "bg-white text-black"
                  : "bg-zinc-900/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title={t("playtime.title")} description={t("playtime.description")}>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={hoursPlayed}
              onChange={(e) => {
                const v = e.target.value
                if (v === "") { setHoursPlayed(""); return }
                const n = parseInt(v)
                if (!isNaN(n) && n >= 0 && n <= 99999) setHoursPlayed(n.toString())
              }}
              min="0"
              max="99999"
              placeholder="0"
              className="w-16 px-2 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-zinc-500">h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={minutesPlayed}
              onChange={(e) => {
                const v = e.target.value
                if (v === "") { setMinutesPlayed(""); return }
                const n = parseInt(v)
                if (!isNaN(n) && n >= 0 && n <= 59) setMinutesPlayed(n.toString())
              }}
              min="0"
              max="59"
              placeholder="0"
              className="w-16 px-2 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-zinc-500">m</span>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title={t("platform.title")} description={t("platform.description")}>
        <PlatformSelect platforms={platforms} value={playedPlatform} onChange={setPlayedPlatform} />
      </ReviewSection>

      {isEditing && (
        <div className="rounded-xl p-4 sm:p-5 bg-red-500/5 border border-red-500/20">
          <h3 className="text-sm font-semibold text-red-400 mb-1">{t("danger.title")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("danger.warning")}</p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-3 text-sm font-medium text-red-400 hover:text-white bg-red-500/5 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t("danger.deleteButton")}
            </button>
          ) : (
            <div className="p-3 sm:p-4 bg-zinc-900/30 border border-red-500/20 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-400">{t("danger.confirmTitle")}</p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {t("danger.confirmMessage")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  {t("danger.cancel")}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-red-300 border-t-white rounded-full animate-spin" />
                  ) : (
                    t("danger.confirmButton")
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
