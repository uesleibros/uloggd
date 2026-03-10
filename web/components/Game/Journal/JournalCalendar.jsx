import { useState, useMemo, useRef, useCallback } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { Play, Plus, Minus } from "lucide-react"

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export function JournalCalendar({ month, year, entries, onDayClick, onBulkAdd, onBulkRemove, loading, disabled }) {
  const { t } = useTranslation("journal.calendar")

  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState(null)
  const [selectedDates, setSelectedDates] = useState(new Set())
  const [hoveredDay, setHoveredDay] = useState(null)
  const dragStartRef = useRef(null)
  const containerRef = useRef(null)

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

  function formatTime(hours, minutes) {
    if (!hours && !minutes) return null
    if (hours && minutes) return `${hours}h${minutes}m`
    if (hours) return `${hours}h`
    return `${minutes}m`
  }

  function handleMouseDown(day, e) {
    if (disabled || isFuture(day)) return
    e.preventDefault()
    
    const dateStr = formatDate(day)
    const hasExisting = hasEntry(day)
    
    setIsDragging(true)
    setDragMode(hasExisting ? "remove" : "add")
    setSelectedDates(new Set([dateStr]))
    dragStartRef.current = dateStr
  }

  function handleMouseEnter(day) {
    setHoveredDay(day)
    if (!isDragging || disabled || isFuture(day)) return
    
    const dateStr = formatDate(day)
    setSelectedDates(prev => {
      const newSet = new Set(prev)
      newSet.add(dateStr)
      return newSet
    })
  }

  function handleMouseLeaveDay() {
    setHoveredDay(null)
  }

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return

    const dates = Array.from(selectedDates)
    
    if (dates.length === 1) {
      onDayClick(dates[0])
    } else if (dates.length > 1) {
      if (dragMode === "add") {
        onBulkAdd(dates)
      } else {
        onBulkRemove(dates)
      }
    }

    setIsDragging(false)
    setDragMode(null)
    setSelectedDates(new Set())
    dragStartRef.current = null
  }, [isDragging, selectedDates, dragMode, onDayClick, onBulkAdd, onBulkRemove])

  const handleMouseLeave = useCallback(() => {
    if (isDragging && selectedDates.size > 0) {
      handleMouseUp()
    }
  }, [isDragging, selectedDates.size, handleMouseUp])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">{t("loading")}</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="select-none"
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
    >
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3">
            {t(`weekdays.${day}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
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
          const isHovered = hoveredDay === day && !isDragging

          const timeStr = entry ? formatTime(entry.hours, entry.minutes) : null

          return (
            <div
              key={day}
              onMouseDown={(e) => handleMouseDown(day, e)}
              onMouseEnter={() => handleMouseEnter(day)}
              onMouseLeave={handleMouseLeaveDay}
              className={`
                relative aspect-square rounded-xl transition-all duration-150
                ${disabled ? "pointer-events-none opacity-50" : ""}
                ${future ? "pointer-events-none" : "cursor-pointer"}
              `}
            >
              <div
                className={`
                  absolute inset-0 rounded-xl flex flex-col items-center justify-center transition-all duration-150
                  ${future ? "opacity-30" : ""}
                  ${todayClass && !hasLog && !isSelected 
                    ? "ring-2 ring-inset ring-emerald-500" 
                    : ""
                  }
                  ${hasLog && !isBeingRemoved
                    ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 ring-1 ring-inset ring-emerald-500/30" 
                    : !hasLog && !isSelected 
                      ? "hover:bg-zinc-800/80" 
                      : ""
                  }
                  ${isBeingAdded 
                    ? "bg-emerald-500/30 ring-2 ring-inset ring-emerald-400 scale-95" 
                    : ""
                  }
                  ${isBeingRemoved 
                    ? "bg-red-500/20 ring-2 ring-inset ring-red-400 scale-95" 
                    : ""
                  }
                  ${isHovered && !future && !hasLog
                    ? "bg-zinc-800 ring-1 ring-inset ring-zinc-600"
                    : ""
                  }
                  ${isHovered && !future && hasLog && !isSelected
                    ? "ring-2 ring-inset ring-emerald-400"
                    : ""
                  }
                `}
              >
                <span 
                  className={`
                    text-lg font-semibold transition-colors duration-150
                    ${future ? "text-zinc-700" : ""}
                    ${todayClass && !hasLog ? "text-emerald-400" : ""}
                    ${hasLog && !isBeingRemoved ? "text-emerald-300" : ""}
                    ${!future && !todayClass && !hasLog && !isSelected ? "text-zinc-300" : ""}
                    ${isBeingAdded ? "text-emerald-200" : ""}
                    ${isBeingRemoved ? "text-red-300" : ""}
                  `}
                >
                  {day}
                </span>

                {hasLog && timeStr && !isBeingRemoved && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                      {timeStr}
                    </span>
                  </div>
                )}

                {hasLog && !timeStr && !isBeingRemoved && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}

                {isHovered && !future && !hasLog && !isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 rounded-xl bg-zinc-800/50" />
                    <Plus className="w-5 h-5 text-zinc-400 relative z-10" />
                  </div>
                )}

                {todayClass && (
                  <div className="absolute top-1.5 right-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isDragging && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div 
            className={`
              flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-sm border
              ${dragMode === "add" 
                ? "bg-emerald-500/90 border-emerald-400/50 text-white" 
                : "bg-red-500/90 border-red-400/50 text-white"
              }
            `}
          >
            {dragMode === "add" ? (
              <Plus className="w-5 h-5" />
            ) : (
              <Minus className="w-5 h-5" />
            )}
            <span className="text-sm font-semibold">
              {dragMode === "add" 
                ? t("dragging.adding", { count: selectedDates.size })
                : t("dragging.removing", { count: selectedDates.size })
              }
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 ring-1 ring-inset ring-emerald-500/40" />
          <span className="text-xs text-zinc-500">{t("legend.played")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md ring-2 ring-inset ring-emerald-500" />
          <span className="text-xs text-zinc-500">{t("legend.today")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-zinc-800 ring-1 ring-inset ring-zinc-600 flex items-center justify-center">
            <Plus className="w-2.5 h-2.5 text-zinc-500" />
          </div>
          <span className="text-xs text-zinc-500">{t("legend.clickToAdd")}</span>
        </div>
      </div>
    </div>
  )
}