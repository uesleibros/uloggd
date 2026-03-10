import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { useTranslation } from "#hooks/useTranslation"

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function cn(...args) {
  return args.filter(Boolean).join(" ")
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function JournalCalendar({
  month,
  year,
  entries,
  onDayClick,
  onBulkAdd,
  onBulkRemove,
  loading,
  disabled,
}) {
  const { t } = useTranslation("journal.calendar")
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)

  const callbacksRef = useRef({ onDayClick, onBulkAdd, onBulkRemove })
  callbacksRef.current = { onDayClick, onBulkAdd, onBulkRemove }

  const { days, startDay } = useMemo(() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    return {
      days: Array.from({ length: last.getDate() }, (_, i) => i + 1),
      startDay: first.getDay(),
    }
  }, [month, year])

  const todayStr = useMemo(() => {
    const d = new Date()
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])

  const formatDate = useCallback(
    (day) => toDateStr(year, month, day),
    [year, month],
  )

  const isFuture = useCallback((day) => formatDate(day) > todayStr, [formatDate, todayStr])
  const isToday = useCallback((day) => formatDate(day) === todayStr, [formatDate, todayStr])

  const commitDrag = useCallback(() => {
    const state = dragRef.current
    if (!state) return

    const dates = Array.from(state.dates).sort()
    const { onDayClick, onBulkAdd, onBulkRemove } = callbacksRef.current

    if (dates.length === 1) onDayClick(dates[0])
    else if (state.mode === "add") onBulkAdd(dates)
    else onBulkRemove(dates)

    dragRef.current = null
    setDrag(null)
  }, [])

  const addDateToDrag = useCallback((dateStr) => {
    setDrag((prev) => {
      if (!prev || prev.dates.has(dateStr)) return prev
      const dates = new Set(prev.dates)
      dates.add(dateStr)
      const next = { ...prev, dates }
      dragRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    function onTouchMove(e) {
      if (!dragRef.current) return
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest("[data-date]")
      const dateStr = el?.dataset.date
      if (dateStr && dateStr <= todayStr) addDateToDrag(dateStr)
    }

    window.addEventListener("mouseup", commitDrag)
    window.addEventListener("touchend", commitDrag)
    window.addEventListener("touchcancel", commitDrag)
    window.addEventListener("touchmove", onTouchMove, { passive: true })

    return () => {
      window.removeEventListener("mouseup", commitDrag)
      window.removeEventListener("touchend", commitDrag)
      window.removeEventListener("touchcancel", commitDrag)
      window.removeEventListener("touchmove", onTouchMove)
    }
  }, [commitDrag, addDateToDrag, todayStr])

  function handleDragStart(day, e) {
    if (disabled || isFuture(day)) return
    e.preventDefault()

    const dateStr = formatDate(day)
    const state = {
      mode: entries[dateStr] ? "remove" : "add",
      dates: new Set([dateStr]),
    }

    dragRef.current = state
    setDrag(state)
  }

  function handleDragEnter(day) {
    if (!dragRef.current || disabled || isFuture(day)) return
    addDateToDrag(formatDate(day))
  }

  function formatTime(entry) {
    if (!entry?.hours && !entry?.minutes) return null
    return [entry.hours > 0 && `${entry.hours}h`, entry.minutes > 0 && `${entry.minutes}m`]
      .filter(Boolean)
      .join("")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-sm font-medium text-zinc-500 py-3">
            {t(`weekdays.${d}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 touch-none" role="grid">
        {Array.from({ length: startDay }, (_, i) => (
          <div key={`pad-${i}`} className="aspect-square" aria-hidden="true" />
        ))}

        {days.map((day) => {
          const dateStr = formatDate(day)
          const future = isFuture(day)
          const today = isToday(day)
          const entry = entries[dateStr]
          const logged = !!entry
          const selected = drag?.dates.has(dateStr)
          const adding = selected && drag?.mode === "add"
          const removing = selected && drag?.mode === "remove"
          const time = formatTime(entry)

          return (
            <button
              key={day}
              data-date={dateStr}
              disabled={future || disabled}
              onMouseDown={(e) => handleDragStart(day, e)}
              onMouseEnter={() => handleDragEnter(day)}
              onTouchStart={(e) => handleDragStart(day, e)}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center relative",
                "text-base font-medium transition-colors",
                disabled && "pointer-events-none opacity-50",
                future && "text-zinc-700 cursor-not-allowed",
                adding && "bg-emerald-500/40 text-emerald-300 ring-2 ring-emerald-400 cursor-pointer",
                removing && "bg-red-500/30 text-red-400 ring-2 ring-red-400 cursor-pointer",
                !future && !selected && logged &&
                  "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer",
                !future && !selected && !logged &&
                  "text-zinc-300 hover:bg-zinc-700/50 cursor-pointer",
                today && !logged && !selected &&
                  "ring-2 ring-emerald-500/50 text-emerald-400",
              )}
            >
              <span className="text-lg">{day}</span>

              {time && !removing && (
                <span className="text-[11px] text-emerald-500/80 mt-0.5">{time}</span>
              )}

              {logged && !removing && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          )
        })}
      </div>

      {drag && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={cn(
              "px-4 py-2 rounded-full shadow-xl border backdrop-blur-sm",
              drag.mode === "add"
                ? "bg-emerald-950/90 border-emerald-800 text-emerald-400"
                : "bg-red-950/90 border-red-800 text-red-400",
            )}
          >
            <span className="text-sm font-medium">
              {drag.mode === "add"
                ? t("dragging.adding", { count: drag.dates.size })
                : t("dragging.removing", { count: drag.dates.size })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}