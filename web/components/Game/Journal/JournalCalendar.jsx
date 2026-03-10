import { useMemo } from "react"
import { useTranslation } from "#hooks/useTranslation"

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export function JournalCalendar({ month, year, entries, onDayClick, loading }) {
  const { t } = useTranslation("journal.calendar")

  const { days, startDay } = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay()

    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return { days, startDay }
  }, [month, year])

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  function formatDate(day) {
    const m = String(month + 1).padStart(2, "0")
    const d = String(day).padStart(2, "0")
    return `${year}-${m}-${d}`
  }

  function isToday(day) {
    return formatDate(day) === todayStr
  }

  function isFuture(day) {
    const date = new Date(year, month, day)
    return date > today
  }

  function hasEntry(day) {
    return !!entries[formatDate(day)]
  }

  function getEntryInfo(day) {
    return entries[formatDate(day)]
  }

  function handleClick(day) {
    if (isFuture(day)) return
    const date = new Date(year, month, day)
    onDayClick(date)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
            {t(`weekdays.${day}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {days.map(day => {
          const future = isFuture(day)
          const todayClass = isToday(day)
          const entry = getEntryInfo(day)
          const hasLog = !!entry

          return (
            <button
              key={day}
              onClick={() => handleClick(day)}
              disabled={future}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative
                ${future 
                  ? "text-zinc-700 cursor-not-allowed" 
                  : "cursor-pointer hover:bg-zinc-700/50"
                }
                ${todayClass && !hasLog ? "ring-2 ring-emerald-500/50 text-emerald-400" : ""}
                ${hasLog 
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                  : "text-zinc-300"
                }
              `}
            >
              <span>{day}</span>
              {hasLog && entry.hours + entry.minutes > 0 && (
                <span className="text-[10px] text-emerald-500/80">
                  {entry.hours > 0 ? `${entry.hours}h` : ""}{entry.minutes > 0 ? `${entry.minutes}m` : ""}
                </span>
              )}
              {hasLog && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}