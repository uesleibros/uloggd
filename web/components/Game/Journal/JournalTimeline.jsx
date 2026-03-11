import { useMemo } from "react"
import { Play, Flag, Clock, MessageSquare } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function JournalTimeline({ entries, startedAt, finishedAt }) {
  const { t } = useTranslation("journal.view")

  const grouped = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.played_on.localeCompare(a.played_on))

    const groups = []
    let currentKey = null
    let currentGroup = null

    for (const entry of sorted) {
      const date = new Date(entry.played_on + "T00:00:00")
      const key = `${date.getFullYear()}-${date.getMonth()}`

      if (key !== currentKey) {
        currentKey = key
        currentGroup = {
          label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          entries: [],
        }
        groups.push(currentGroup)
      }

      currentGroup.entries.push(entry)
    }

    return groups
  }, [entries])

  if (entries.length === 0) return null

  function formatEntryTime(entry) {
    const h = entry.hours || 0
    const m = entry.minutes || 0
    if (h === 0 && m === 0) return null
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  return (
    <div className="space-y-6">
      {grouped.map(group => (
        <div key={group.label}>
          <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">
            {group.label}
          </h4>

          <div className="space-y-1">
            {group.entries.map(entry => {
              const date = new Date(entry.played_on + "T00:00:00")
              const isStart = entry.played_on === startedAt
              const isFinish = entry.played_on === finishedAt
              const time = formatEntryTime(entry)
              const hasNote = !!entry.note?.trim()

              return (
                <div
                  key={entry.id}
                  className="group flex gap-3 p-3 rounded-xl hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={`
                      w-2 h-2 rounded-full flex-shrink-0
                      ${isStart ? "bg-sky-400" : isFinish ? "bg-amber-400" : "bg-emerald-500/50"}
                    `} />
                    <div className="w-px flex-1 bg-zinc-800 mt-1" />
                  </div>

                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-300">
                        {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>

                      {time && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                      )}

                      {isStart && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-md">
                          <Play className="w-2.5 h-2.5 fill-sky-400" />
                          {t("started")}
                        </span>
                      )}

                      {isFinish && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                          <Flag className="w-2.5 h-2.5 fill-amber-400" />
                          {t("finished")}
                        </span>
                      )}
                    </div>

                    {hasNote && (
                      <div className="mt-2 flex gap-2">
                        <MessageSquare className="w-3 h-3 text-zinc-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
                          {entry.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
