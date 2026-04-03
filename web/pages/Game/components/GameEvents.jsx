import { useState } from "react"
import { Calendar, ExternalLink, Play, ChevronDown } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

function formatDate(timestamp) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
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

function StatusBadge({ status, t }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20 rounded-full">
        <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
        {t("live")}
      </span>
    )
  }

  if (status === "upcoming") {
    return (
      <span className="px-2 py-0.5 text-[11px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded-full">
        {t("upcoming")}
      </span>
    )
  }

  return null
}

function EventCard({ event, t }) {
  const status = getEventStatus(event)
  const isPast = status === "past"
  const url = event.live_stream_url || `https://www.igdb.com/events/${event.slug}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex gap-4 p-3 -mx-3 rounded-xl hover:bg-zinc-800/50 transition-colors ${isPast ? "opacity-50" : ""}`}
    >
      {event.logo_url ? (
        <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
          <img
            src={event.logo_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-20 h-14 rounded-lg bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4 h-4 text-zinc-600" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
            {event.name}
          </h3>
          <StatusBadge status={status} t={t} />
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {event.start_time && (
            <span>
              {formatDate(event.start_time)}
              {event.end_time && event.start_time !== event.end_time && (
                <> — {formatDate(event.end_time)}</>
              )}
            </span>
          )}
          {event.live_stream_url && (
            <span className="flex items-center gap-1 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-3 h-3" />
              {t("watchStream")}
            </span>
          )}
          {!event.live_stream_url && (
            <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </a>
  )
}

export default function GameEvents({ events }) {
  const { t } = useTranslation("gameEvents")
  const [showAll, setShowAll] = useState(false)

  if (!events?.length) return null

  const sortedEvents = [...events].sort((a, b) => {
    const order = { live: 0, upcoming: 1, past: 2 }
    const diff = order[getEventStatus(a)] - order[getEventStatus(b)]
    if (diff !== 0) return diff
    return (b.start_time || 0) - (a.start_time || 0)
  })

  const displayed = showAll ? sortedEvents : sortedEvents.slice(0, 3)
  const hasMore = sortedEvents.length > 3

  return (
    <div className="py-6 sm:py-8 border-t border-zinc-800/80">
      <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
        {t("title")}
        <span className="ml-2 text-xs font-medium text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">
          {events.length}
        </span>
      </h2>

      <div className="mt-4 space-y-1">
        {displayed.map((event) => (
          <EventCard key={event.id} event={event} t={t} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? t("showLess") : t("showAll", { count: sortedEvents.length })}
        </button>
      )}
    </div>
  )
}
