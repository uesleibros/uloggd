import { useState, useMemo, useRef, useCallback } from "react"
import { Play, Flag } from "lucide-react"
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

const INTENSITY = {
  0: { bg: "", text: "" },
  1: { bg: "bg-emerald-500/12", text: "text-emerald-400/70" },
  2: { bg: "bg-emerald-500/20", text: "text-emerald-400/80" },
  3: { bg: "bg-emerald-500/30", text: "text-emerald-400" },
  4: { bg: "bg-emerald-500/40", text: "text-emerald-300" },
  5: { bg: "bg-emerald-500/50", text: "text-emerald-200" },
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

function getRadius(left, right) {
  if (left && right) return "rounded-none"
  if (left) return "rounded-r-lg md:rounded-r-xl"
  if (right) return "rounded-l-lg md:rounded-l-xl"
  return "rounded-lg md:rounded-xl"
}

export function JournalCalendar({ month, year, entries, startedAt, finishedAt, onDayClick, onBulkAdd, onBulkRemove, loading, disabled, readOnly }) {
  const { t } = useTranslation("journal.calendar")

  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState(null)
  const [selectedDates, setSelectedDates] = useState(new Set())

  const isDraggingRef = useRef(false)
  const dragModeRef = useRef(null)
  const selectedDatesRef = useRef(new Set())
  const pendingRef = useRef(null)
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

      return { ...cell, col, hasLog, connLeft: hasLog && prevHasLog, connRight: hasLog && nextHasLog }
    })
  }, [month, year, entries])

  function handlePointerDown(day) {
    if (readOnly || disabled || formatDate(day) > todayStr) return
    const dateStr = formatDate(day)
    pendingRef.current = { day, dateStr, mode: !!entries[dateStr] ? "remove" : "add" }
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
    if (readOnly || disabled || formatDate(day) > todayStr) return
    const dateStr = formatDate(day)

    if (pendingRef.current && !isDraggingRef.current) {
      if (dateStr !== pendingRef.current.dateStr) activateDrag(pendingRef.current, dateStr)
      return
    }

    if (isDraggingRef.current) extendDrag(dateStr)
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

  function getDayFromTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!el) return null
    const dayEl = el.closest("[data-day]")
    if (!dayEl) return null
    return parseInt(dayEl.dataset.day, 10)
  }

  function renderMarker(dateStr) {
    const isStart = dateStr === startedAt
    const isFinish = dateStr === finishedAt

    if (!isStart && !isFinish) return null

    return (
      <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 flex gap-0.5">
        {isStart && <Play className="w-2 h-2 md:w-2.5 md:h-2.5 text-sky-400 fill-sky-400" />}
        {isFinish && <Flag className="w-2 h-2 md:w-2.5 md:h-2.5 text-amber-400 fill-amber-400" />}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`select-none ${readOnly ? "" : "touch-none"}`}
      onMouseLeave={readOnly ? undefined : handleMouseLeave}
      onMouseUp={readOnly ? undefined : finishInteraction}
      onTouchMove={readOnly ? undefined : (e) => {
        if (!pendingRef.current && !isDraggingRef.current) return
        e.preventDefault()
        const day = getDayFromTouch(e.touches[0])
        if (day) handlePointerEnter(day)
      }}
      onTouchEnd={readOnly ? undefined : (e) => {
        e.preventDefault()
        finishInteraction()
      }}
    >
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-center text-[11px] md:text-xs font-semibold text-zinc-600 uppercase tracking-wider py-2 md:py-3"
          >
            {t(`weekdays.${day}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 md:gap-y-1">
        {cells.map((cell) => {
          const entry = entries[cell.dateStr]
          const intensity = getIntensity(entry)
          const timeDisplay = formatTime(entry)

          if (cell.type === "overflow") {
            const radius = cell.hasLog ? getRadius(cell.connLeft, cell.connRight) : ""

            return (
              <div
                key={cell.dateStr}
                className={`
                  aspect-square flex flex-col items-center justify-center relative overflow-hidden
                  ${cell.hasLog ? `${INTENSITY[intensity].bg} opacity-30` : "opacity-30"}
                  ${radius}
                `}
              >
                {renderMarker(cell.dateStr)}
                <span className="text-xs md:text-sm text-zinc-600">{cell.day}</span>
                {timeDisplay && (
                  <span className="text-[9px] md:text-[10px] text-emerald-500/50 leading-tight">{timeDisplay}</span>
                )}
              </div>
            )
          }

          const future = cell.dateStr > todayStr
          const isToday = cell.dateStr === todayStr
          const isSelected = selectedDates.has(cell.dateStr)
          const isBeingAdded = isSelected && dragMode === "add"
          const isBeingRemoved = isSelected && dragMode === "remove"
          const isStart = cell.dateStr === startedAt
          const isFinish = cell.dateStr === finishedAt

          const radius = isSelected
            ? "rounded-lg md:rounded-xl"
            : cell.hasLog
              ? getRadius(cell.connLeft, cell.connRight)
              : "rounded-lg md:rounded-xl"

          return (
            <div
              key={cell.dateStr}
              data-day={cell.day}
              onMouseDown={readOnly ? undefined : (e) => { e.preventDefault(); handlePointerDown(cell.day) }}
              onMouseEnter={readOnly ? undefined : () => handlePointerEnter(cell.day)}
              onTouchStart={readOnly ? undefined : (e) => { e.preventDefault(); handlePointerDown(cell.day) }}
              className={`
                aspect-square ${radius} flex flex-col items-center justify-center font-medium relative overflow-hidden
                transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-out
                ${disabled && !readOnly ? "pointer-events-none opacity-40" : ""}
                ${future ? "text-zinc-800" : ""}
                ${!readOnly && !future && !disabled ? "cursor-pointer active:scale-[0.92]" : "cursor-default"}
                ${isToday && !cell.hasLog && !isSelected ? "ring-[1.5px] ring-inset ring-emerald-500/40 text-emerald-400" : ""}
                ${cell.hasLog && !isBeingRemoved ? `${INTENSITY[intensity].bg} ${INTENSITY[intensity].text} ${!readOnly ? "hover:brightness-110" : ""}` : ""}
                ${!cell.hasLog && !isSelected && !future && !isToday ? `text-zinc-400 ${!readOnly ? "hover:bg-zinc-800/60 hover:text-zinc-200" : ""}` : ""}
                ${isBeingAdded ? "bg-emerald-500/30 text-emerald-200 ring-[1.5px] ring-inset ring-emerald-400/60 scale-[1.04]" : ""}
                ${isBeingRemoved ? "bg-red-500/20 text-red-300 ring-[1.5px] ring-inset ring-red-400/50 scale-[1.04]" : ""}
                ${isStart && !isBeingRemoved ? "ring-[1.5px] ring-inset ring-sky-400/50" : ""}
                ${isFinish && !isBeingRemoved ? "ring-[1.5px] ring-inset ring-amber-400/50" : ""}
                ${isStart && isFinish && !isBeingRemoved ? "ring-[1.5px] ring-inset ring-purple-400/50" : ""}
              `}
            >
              {renderMarker(cell.dateStr)}
              <span className={`leading-none ${cell.hasLog && !isBeingRemoved ? "text-sm md:text-base" : "text-sm md:text-lg"}`}>
                {cell.day}
              </span>
              {timeDisplay && !isBeingRemoved && (
                <span className="text-[9px] md:text-[10px] leading-none mt-0.5 opacity-70">{timeDisplay}</span>
              )}
            </div>
          )
        })}
      </div>

      {(startedAt || finishedAt) && (
        <div className="flex items-center gap-3 mt-3 px-1">
          {startedAt && (
            <div className="flex items-center gap-1.5">
              <Play className="w-2.5 h-2.5 text-sky-400 fill-sky-400" />
              <span className="text-[10px] md:text-[11px] text-zinc-500">{t("legend.started")}</span>
            </div>
          )}
          {finishedAt && (
            <div className="flex items-center gap-1.5">
              <Flag className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span className="text-[10px] md:text-[11px] text-zinc-500">{t("legend.finished")}</span>
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div
          className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            px-5 py-2.5 rounded-2xl shadow-2xl
            border backdrop-blur-xl
            transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isDragging
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-4 opacity-0 scale-90 pointer-events-none"
            }
            ${dragMode === "add"
              ? "bg-emerald-950/80 border-emerald-500/30 shadow-emerald-500/10"
              : "bg-red-950/80 border-red-500/30 shadow-red-500/10"
            }
          `}
        >
          <span className={`text-sm font-medium tracking-tight ${dragMode === "add" ? "text-emerald-300" : "text-red-300"}`}>
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
