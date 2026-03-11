import { useState, useMemo, useRef, useCallback } from "react"
import { useTranslation } from "#hooks/useTranslation"

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export function JournalCalendar({ month, year, entries, onDayClick, onBulkAdd, onBulkRemove, loading, disabled }) {
  const { t } = useTranslation("journal.calendar")

  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState(null)
  const [selectedDates, setSelectedDates] = useState(new Set())

  const isDraggingRef = useRef(false)
  const dragModeRef = useRef(null)
  const selectedDatesRef = useRef(new Set())
  const containerRef = useRef(null)

  const { days, startDay, prevDays, nextDays } = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay()

    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    // Dias do mês anterior pra preencher o início
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    const prevDays = []
    for (let i = startDay - 1; i >= 0; i--) {
      prevDays.push(prevMonthLastDay - i)
    }

    // Dias do próximo mês pra completar a última row
    const totalCells = startDay + daysInMonth
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
    const nextDays = []
    for (let i = 1; i <= remaining; i++) {
      nextDays.push(i)
    }

    return { days, startDay, prevDays, nextDays }
  }, [month, year])

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  function formatDate(day) {
    const m = String(month + 1).padStart(2, "0")
    const d = String(day).padStart(2, "0")
    return `${year}-${m}-${d}`
  }

  function isToday(day) {
    return formatDate(day) === todayStr
  }

  function isFuture(day) {
    return formatDate(day) > todayStr
  }

  function hasEntry(day) {
    return !!entries[formatDate(day)]
  }

  function getEntryInfo(day) {
    return entries[formatDate(day)]
  }

  function startDrag(day) {
    if (disabled || isFuture(day)) return

    const dateStr = formatDate(day)
    const mode = hasEntry(day) ? "remove" : "add"
    const dates = new Set([dateStr])

    isDraggingRef.current = true
    dragModeRef.current = mode
    selectedDatesRef.current = dates

    setIsDragging(true)
    setDragMode(mode)
    setSelectedDates(dates)
  }

  function extendDrag(day) {
    if (!isDraggingRef.current || disabled || isFuture(day)) return

    const dateStr = formatDate(day)
    if (selectedDatesRef.current.has(dateStr)) return

    const newSet = new Set(selectedDatesRef.current)
    newSet.add(dateStr)

    selectedDatesRef.current = newSet
    setSelectedDates(new Set(newSet))
  }

  const finishDrag = useCallback(() => {
    if (!isDraggingRef.current) return

    const dates = Array.from(selectedDatesRef.current)
    const mode = dragModeRef.current

    if (dates.length === 1) {
      onDayClick?.(dates[0])
    } else if (dates.length > 1) {
      if (mode === "add") {
        onBulkAdd?.(dates)
      } else {
        onBulkRemove?.(dates)
      }
    }

    isDraggingRef.current = false
    dragModeRef.current = null
    selectedDatesRef.current = new Set()

    setIsDragging(false)
    setDragMode(null)
    setSelectedDates(new Set())
  }, [onDayClick, onBulkAdd, onBulkRemove])

  function handleMouseDown(day, e) {
    e.preventDefault()
    startDrag(day)
  }

  function handleMouseEnter(day) {
    extendDrag(day)
  }

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) finishDrag()
  }, [finishDrag])

  function handleTouchStart(day, e) {
    e.preventDefault()
    startDrag(day)
  }

  function getDayFromTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!el) return null
    const dayEl = el.closest("[data-day]")
    if (!dayEl) return null
    return parseInt(dayEl.dataset.day, 10)
  }

  function handleTouchMove(e) {
    if (!isDraggingRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const day = getDayFromTouch(touch)
    if (day) extendDrag(day)
  }

  function handleTouchEnd(e) {
    e.preventDefault()
    finishDrag()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="select-none touch-none"
      onMouseLeave={handleMouseLeave}
      onMouseUp={finishDrag}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-sm font-medium text-zinc-500 py-3">
            {t(`weekdays.${day}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {prevDays.map(day => (
          <div
            key={`prev-${day}`}
            className="aspect-square rounded-xl flex items-center justify-center text-sm text-zinc-700"
          >
            {day}
          </div>
        ))}

        {days.map(day => {
          const future = isFuture(day)
          const todayClass = isToday(day)
          const entry = getEntryInfo(day)
          const hasLog = !!entry
          const dateStr = formatDate(day)
          const isSelected = selectedDates.has(dateStr)
          const isBeingAdded = isSelected && dragMode === "add"
          const isBeingRemoved = isSelected && dragMode === "remove"

          const timeDisplay = entry && (entry.hours > 0 || entry.minutes > 0)
            ? `${entry.hours > 0 ? `${entry.hours}h` : ""}${entry.minutes > 0 ? `${entry.minutes}m` : ""}`
            : null

          return (
            <button
              key={day}
              data-day={day}
              onMouseDown={(e) => handleMouseDown(day, e)}
              onMouseEnter={() => handleMouseEnter(day)}
              onTouchStart={(e) => handleTouchStart(day, e)}
              disabled={future || disabled}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center text-base font-medium transition-all relative
                ${disabled ? "pointer-events-none opacity-50" : ""}
                ${future
                  ? "text-zinc-700 cursor-not-allowed"
                  : "cursor-pointer"
                }
                ${todayClass && !hasLog && !isSelected ? "ring-2 ring-emerald-500/50 text-emerald-400" : ""}
                ${hasLog && !isBeingRemoved
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  : !hasLog && !isSelected ? "text-zinc-300 hover:bg-zinc-700/50" : ""
                }
                ${isBeingAdded ? "bg-emerald-500/40 text-emerald-300 ring-2 ring-emerald-400" : ""}
                ${isBeingRemoved ? "bg-red-500/30 text-red-400 ring-2 ring-red-400" : ""}
              `}
            >
              <span className="text-lg">{day}</span>
              {timeDisplay && !isBeingRemoved && (
                <span className="text-[11px] text-emerald-500/80 mt-0.5">
                  {timeDisplay}
                </span>
              )}
              {hasLog && !isBeingRemoved && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          )
        })}

        {nextDays.map(day => (
          <div
            key={`next-${day}`}
            className="aspect-square rounded-xl flex items-center justify-center text-sm text-zinc-700"
          >
            {day}
          </div>
        ))}
      </div>

      {isDragging && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-800 border border-zinc-600 shadow-xl">
          <span className={`text-sm font-medium ${dragMode === "add" ? "text-emerald-400" : "text-red-400"}`}>
            {dragMode === "add"
              ? t("dragging.adding", { count: selectedDates.size })
              : t("dragging.removing", { count: selectedDates.size })
            }
          </span>
        </div>
      )}
    </div>
  )
}
