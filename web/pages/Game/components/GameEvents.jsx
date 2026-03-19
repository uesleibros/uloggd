import { Calendar, ExternalLink, Play } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

function formatDate(timestamp) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function EventCard({ event }) {
  const isPast = event.end_time && event.end_time * 1000 < Date.now()
  const isLive = event.start_time && event.end_time && 
    Date.now() >= event.start_time * 1000 && 
    Date.now() <= event.end_time * 1000

  return (
    <div className={`flex gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 ${isPast ? 'opacity-60' : ''}`}>
      {event.logo_url && (
        <img
          src={event.thumb_url}
          alt={event.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white truncate">{event.name}</h3>
          {isLive && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>
        
        {event.start_time && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDate(event.start_time)}
              {event.end_time && event.end_time !== event.start_time && (
                <> — {formatDate(event.end_time)}</>
              )}
            </span>
          </div>
        )}
        
        {event.description && (
          <p className="mt-2 text-sm text-zinc-500 line-clamp-2">
            {event.description}
          </p>
        )}
        
        {event.live_stream_url && (
          <a
            href={event.live_stream_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Watch Stream
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}

export default function GameEvents({ events }) {
  const { t } = useTranslation("game")
  
  if (!events?.length) return null

  return (
    <>
      <div className="border-t border-zinc-800 my-6 sm:my-8" />
      
      <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
        {t("content.events.title", "Events")}
        <span className="text-sm text-zinc-500 font-normal">({events.length})</span>
      </h2>

      <div className="mt-4 space-y-3">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </>
  )
}
