import { useState } from "react"
import { Calendar, ExternalLink, Play, MapPin, ChevronDown, Video, Sparkles } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

function formatDate(timestamp, options = {}) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  })
}

function formatTime(timestamp) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  })
}

function getEventStatus(event) {
  const now = Date.now()
  const start = event.start_time ? event.start_time * 1000 : null
  const end = event.end_time ? event.end_time * 1000 : null

  if (start && end && now >= start && now <= end) return "live"
  if (start && now < start) return "upcoming"
  return "past"
}

function EventCard({ event, t }) {
  const status = getEventStatus(event)
  const isPast = status === "past"
  const isLive = status === "live"
  const isUpcoming = status === "upcoming"

  return (
    <a
      href={event.live_stream_url || `https://www.igdb.com/events/${event.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all hover:bg-zinc-800/30 ${isPast ? "opacity-60" : ""}`}
    >
      {event.logo_url && (
        <div className="relative w-full h-36 sm:h-44 overflow-hidden">
          <img
            src={event.logo_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/30 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-red-500 text-white rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                {t("live")}
              </span>
            )}
            {isUpcoming && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-purple-500/80 backdrop-blur-sm text-white rounded-full">
                <Sparkles className="w-3 h-3" />
                {t("upcoming")}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2 drop-shadow-lg">
              {event.name}
            </h3>
          </div>
        </div>
      )}

      <div className="p-4">
        {!event.logo_url && (
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
                  {event.name}
                </h3>
                {isLive && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    {t("live")}
                  </span>
                )}
                {isUpcoming && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded-full">
                    {t("upcoming")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {event.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
            {event.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {event.start_time && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(event.start_time)}
                {event.end_time && event.start_time !== event.end_time && (
                  <span className="text-zinc-600">— {formatDate(event.end_time)}</span>
                )}
              </span>
            )}

            {event.time_zone && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <MapPin className="w-3.5 h-3.5" />
                {event.time_zone}
              </span>
            )}

            {event.videos?.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Video className="w-3.5 h-3.5" />
                {event.videos.length} {t("videos")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {event.live_stream_url ? (
              <>
                <Play className="w-3 h-3" />
                {t("watchStream")}
              </>
            ) : (
              <>
                {t("viewDetails")}
                <ExternalLink className="w-3 h-3" />
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}

function EmptyState({ t }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
        <Calendar className="w-6 h-6 text-zinc-600" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-300 mb-1">
        {t("empty.title")}
      </h3>
      <p className="text-xs text-zinc-500 max-w-xs">
        {t("empty.description")}
      </p>
    </div>
  )
}

export default function GameEvents({ events }) {
  const { t } = useTranslation("gameEvents")
  const [showAll, setShowAll] = useState(false)

  if (!events?.length) return null

  const sortedEvents = [...events].sort((a, b) => {
    const statusOrder = { live: 0, upcoming: 1, past: 2 }
    const statusA = getEventStatus(a)
    const statusB = getEventStatus(b)
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB]
    }
    return (b.start_time || 0) - (a.start_time || 0)
  })

  const displayedEvents = showAll ? sortedEvents : sortedEvents.slice(0, 3)
  const hasMore = sortedEvents.length > 3

  const liveCount = sortedEvents.filter(e => getEventStatus(e) === "live").length
  const upcomingCount = sortedEvents.filter(e => getEventStatus(e) === "upcoming").length

  return (
    <>
      <div className="border-t border-zinc-800 my-6 sm:my-8" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              {t("title")}
              <span className="text-sm text-zinc-500 font-normal">({events.length})</span>
            </h2>
            {(liveCount > 0 || upcomingCount > 0) && (
              <p className="text-xs text-zinc-500">
                {liveCount > 0 && (
                  <span className="text-red-400">{liveCount} {t("liveNow")}</span>
                )}
                {liveCount > 0 && upcomingCount > 0 && " · "}
                {upcomingCount > 0 && (
                  <span className="text-purple-400">{upcomingCount} {t("upcomingSoon")}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayedEvents.map(event => (
          <EventCard key={event.id} event={event} t={t} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 mt-4 text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? t("showLess") : t("showAll", { count: sortedEvents.length })}
        </button>
      )}
    </>
  )
}
