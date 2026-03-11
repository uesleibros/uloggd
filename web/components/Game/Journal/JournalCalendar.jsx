import { useState, useMemo, useRef, useCallback } from "react"
import { useTranslation } from "#hooks/useTranslation"

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function getIntensity(entry) {
  if (!entry) return 0
  const total = (entry.hours || 0) * 60 + (entry.minutes || 0)
  if (total === 0) return 1
  if (total <= 30) return 1
  if (total <= 60) return 2
  if (total <= 120) return 3
  if (total <= 240) return 4
  return 5
}

const INTENSITY_BG = {
  0: "",
  1: "bg-emerald-500/15",
  2: "bg-emerald-500/25",
  3: "bg-emerald-500/35",
  4: "bg-emerald-500/45",
  5: "bg-emerald-500/55",
}

const INTENSITY_TEXT = {
  0: "",
  1: "text-emerald-400/70",
  2: "text-emerald-400/80",
  3: "text-emerald-400",
  4: "text-emerald-300",
  5: "text-emerald-300",
}

function formatTime(entry) {
  if (!entry) return null
  const h = entry.hours || 0
  const m = entry.minutes || 0
  if (h === 0 && m === 0) return null
  if (h > 0 && m > 0) return `${h}:${String(m).padStart(2, "0")}`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getRounding(left, right) {
  if (left && right) return ""
  if (left) return "rounded-r-xl"
  if (right) return "rounded-l-xl"
  return "rounded-xl"
}

export function JournalCalendar({ month, year, entries, onDayClick, onBulkAdd, onBulkRemove, loading, disabled }) {
  const { t } = useTranslation("journal.calendar")

  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState(null)
  const [selectedDates, setSelectedDates] = useState(new Set())

  const isDraggingRef = useRef(false)
  const dragModeRef = useRef(null)
  const selectedDatesRef = useRef(new Set())
  const pendingRef = useRef(null) // { day, dateStr, mode } — click pendente, vira drag se mover
  const containerRef = useRef(null)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  function formatDate(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay()

    const fmt = (y, m, d) =>
      `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

    const pMonth = month === 0 ? 11 : month - 1
    const pYear = month === 0 ? year - 1 : year
    const prevLastDay = new Date(year, month, 0).getDate()

    const nMonth = month === 11 ? 0 : month + 1
    const nYear = month === 11 ? year + 1 : year
    const totalCells = startDay + daysInMonth
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)

    const all = []

    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevLastDay - i
      all.push({ type: "overflow", day, dateStr: fmt(pYear, pMonth, day) })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      all.push({ type: "current", day: d, dateStr: fmt(year, month, d) })
    }

    for (let i = 1; i <= remaining; i++) {
      all.push({ type: "overflow", day: i, dateStr: fmt(nYear, nMonth, i) })
    }

    return all.map((cell, i) => {
      const col = i % 7
      const hasLog = !!entries[cell.dateStr]
      const prevHasLog = col > 0 && i > 0 && !!entries[all[i - 1].dateStr]
      const nextHasLog = col < 6 && i < all.length - 1 && !!entries[all[i + 1].dateStr]

      return {
        ...cell,
        col,
        hasLog,
        connectedLeft: hasLog && prevHasLog,
        connectedRight: hasLog && nextHasLog,
      }
    })
  }, [month, year, entries])

  function handlePointerDown(day) {
    if (disabled || formatDate(day) > todayStr) return

    const dateStr = formatDate(day)
    const mode = !!entries[dateStr] ? "remove" : "add"

    pendingRef.current = { day, dateStr, mode }
  }

  function activateDrag(pending, newDateStr) {
    const dates = new Set([pending.dateStr, newDateStr])

    isDraggingRef.current = true
    dragModeRef.current = pending.mode
    selectedDatesRef.current = dates

    setIsDragging(true)
    setDragMode(pending.mode)
    setSelectedDates(dates)

    pendingRef.current = null
  }

  function extendDrag(dateStr) {
    if (selectedDatesRef.current.has(dateStr)) return

    const newSet = new Set(selectedDatesRef.current)
    newSet.add(dateStr)

    selectedDatesRef.current = newSet
    setSelectedDates(new Set(newSet))
  }

  function handlePointerEnter(day) {
    if (disabled || formatDate(day) > todayStr) return

    const dateStr = formatDate(day)

    if (pendingRef.current && !isDraggingRef.current) {
      if (dateStr !== pendingRef.current.dateStr) {
        activateDrag(pendingRef.current, dateStr)
      }
      return
    }

    if (isDraggingRef.current) {
      extendDrag(dateStr)
    }
  }

  const finishInteraction = useCallback(() => {
    if (pendingRef.current && !isDraggingRef.current) {
      onDayClick?.(pendingRef.current.dateStr)
      pendingRef.current = null
      return
    }

    if (isDraggingRef.current) {
      const dates = Array.from(selectedDatesRef.current)
      const mode = dragModeRef.current

      if (mode === "add") onBulkAdd?.(dates)
      else onBulkRemove?.(dates)

      isDraggingRef.current = false
      dragModeRef.current = null
      selectedDatesRef.current = new Set()
      pendingRef.current = null

      setIsDragging(false)
      setDragMode(null)
      setSelectedDates(new Set())
    }
  }, [onDayClick, onBulkAdd, onBulkRemove])

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current || pendingRef.current) finishInteraction()
  }, [finishInteraction])

  function handleMouseDown(day, e) {
    e.preventDefault()
    handlePointerDown(day)
  }

  function handleMouseEnter(day) {
    handlePointerEnter(day)
  }

  function handleTouchStart(day, e) {
    e.preventDefault()
    handlePointerDown(day)
  }

  function getDayFromTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!el) return null
    const dayEl = el.closest("[data-day]")
    if (!dayEl) return null
    return parseInt(dayEl.dataset.day, 10)
  }

  function handleTouchMove(e) {
    if (!pendingRef.current && !isDraggingRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const day = getDayFromTouch(touch)
    if (day) handlePointerEnter(day)
  }

  function handleTouchEnd(e) {
    e.preventDefault()
    finishInteraction()
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
      onMouseUp={finishInteraction}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-sm font-medium text-zinc-500 py-3">
            {t(`weekdays.${day}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell) => {
          const entry = entries[cell.dateStr]
          const intensity = getIntensity(entry)
          const timeDisplay = formatTime(entry)

          if (cell.type === "overflow") {
            const rounding = cell.hasLog
              ? getRounding(cell.connectedLeft, cell.connectedRight)
              : ""

            return (
              <div
                key={cell.dateStr}
                className={`
                  aspect-square flex flex-col items-center justify-center opacity-40
                  ${cell.hasLog ? INTENSITY_BG[intensity] : ""}
                  ${rounding}
                `}
              >
                <span className="text-sm text-zinc-600">{cell.day}</span>
                {timeDisplay && (
                  <span className="text-[10px] text-emerald-500/50 leading-tight">
                    {timeDisplay}
                  </span>
                )}
              </div>
            )
          }

          const future = cell.dateStr > todayStr
          const isCurrentToday = cell.dateStr === todayStr
          const isSelected = selectedDates.has(cell.dateStr)
          const isBeingAdded = isSelected && dragMode === "add"
          const isBeingRemoved = isSelected && dragMode === "remove"

          const rounding = isSelected
            ? "rounded-xl"
            : cell.hasLog
              ? getRounding(cell.connectedLeft, cell.connectedRight)
              : "rounded-xl"

          return (
            <button
              key={cell.dateStr}
              data-day={cell.day}
              onMouseDown={(e) => handleMouseDown(cell.day, e)}
              onMouseEnter={() => handleMouseEnter(cell.day)}
              onTouchStart={(e) => handleTouchStart(cell.day, e)}
              disabled={future || disabled}
              className={`
                aspect-square ${rounding} flex flex-col items-center justify-center font-medium transition-all relative
                ${disabled ? "pointer-events-none opacity-50" : ""}
                ${future ? "text-zinc-700 cursor-not-allowed" : "cursor-pointer"}
                ${isCurrentToday && !cell.hasLog && !isSelected ? "ring-2 ring-emerald-500/50 text-emerald-400" : ""}
                ${cell.hasLog && !isBeingRemoved
                  ? `${INTENSITY_BG[intensity]} ${INTENSITY_TEXT[intensity]} hover:brightness-125`
                  : !cell.hasLog && !isSelected ? "text-zinc-300 hover:bg-zinc-700/50" : ""
                }
                ${isBeingAdded ? "bg-emerald-500/40 text-emerald-300 ring-2 ring-emerald-400" : ""}
                ${isBeingRemoved ? "bg-red-500/30 text-red-400 ring-2 ring-red-400" : ""}
              `}
            >
              <span className={cell.hasLog && !isBeingRemoved ? "text-base" : "text-lg"}>{cell.day}</span>
              {timeDisplay && !isBeingRemoved && (
                <span className="text-[10px] leading-tight opacity-75">
                  {timeDisplay}
                </span>
              )}
            </button>
          )
        })}
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
