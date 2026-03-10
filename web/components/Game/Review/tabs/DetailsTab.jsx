import { useState, useEffect } from "react"
import { RotateCcw, Trash2, AlertTriangle, Calendar, Clock, Link2, X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import { ReviewSection } from "../shared/ReviewSection"
import { PlatformSelect } from "../inputs/PlatformSelect"
import { MAX_TITLE_LENGTH } from "../constants"

function JourneySelector({ gameId, value, onChange }) {
  const { t } = useTranslation("review.details.journey")
  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJourneys()
  }, [gameId])

  async function fetchJourneys() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/journeys/@me/list?gameId=${gameId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setJourneys(data.journeys || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const selectedJourney = journeys.find(j => j.id === value)

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg">
        <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">{t("loading")}</span>
      </div>
    )
  }

  if (journeys.length === 0) {
    return (
      <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg">
        <p className="text-sm text-zinc-500">{t("noJourneys")}</p>
      </div>
    )
  }

  if (selectedJourney) {
    const totalMinutes = selectedJourney.total_minutes || 0
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const sessionCount = selectedJourney.journey_entries?.[0]?.count || 0

    return (
      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedJourney.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {sessionCount} {sessionCount === 1 ? t("session") : t("sessions")}
                </span>
                {totalMinutes > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {hours > 0 && `${hours}h`}{minutes > 0 && `${minutes}m`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {journeys.map((journey) => {
        const totalMinutes = journey.total_minutes || 0
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        const sessionCount = journey.journey_entries?.[0]?.count || 0

        return (
          <button
            key={journey.id}
            type="button"
            onClick={() => onChange(journey.id)}
            className="w-full p-3 bg-zinc-900/50 border border-zinc-700/50 hover:border-zinc-600 rounded-lg text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 group-hover:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 transition-colors">
                <Calendar className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-300 group-hover:text-white truncate transition-colors">
                  {journey.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
                  <span>{sessionCount} {sessionCount === 1 ? t("session") : t("sessions")}</span>
                  {totalMinutes > 0 && (
                    <span>{hours > 0 && `${hours}h`}{minutes > 0 && `${minutes}m`}</span>
                  )}
                </div>
              </div>
              <Link2 className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function DetailsTab({
  gameId,
  reviewTitle, setReviewTitle,
  replay, setReplay,
  hoursPlayed, setHoursPlayed,
  minutesPlayed, setMinutesPlayed,
  playedPlatform, setPlayedPlatform,
  journeyId, setJourneyId,
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

      <ReviewSection title={t("journey.title")} description={t("journey.description")}>
        <JourneySelector gameId={gameId} value={journeyId} onChange={setJourneyId} />
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