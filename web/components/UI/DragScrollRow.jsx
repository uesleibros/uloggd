import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useState } from "react"

const DragScrollRow = forwardRef(function DragScrollRow({
  children,
  className = "",
  autoScroll = false,
  autoScrollSpeed = 0.04,
  loop = false,
  showEdgeFade = true,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  ...props
}, ref) {
  const scrollRef = useRef(null)
  const rafRef = useRef(null)
  const virtualScrollLeft = useRef(0)
  const lastTimeRef = useRef(null)
  const isPausedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    hasMoved: false,
    directionDecided: false,
    isHorizontal: false
  })

  useImperativeHandle(ref, () => scrollRef.current)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    if (!(!isPausedRef.current && autoScroll && !isDraggingRef.current)) {
      virtualScrollLeft.current = el.scrollLeft
    }

    if (showEdgeFade) {
      setCanScrollLeft(el.scrollLeft > 2)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
    }
  }, [showEdgeFade, autoScroll])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    el.addEventListener("scroll", updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)

    return () => {
      el.removeEventListener("scroll", updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState])

  const normalizeScroll = useCallback(() => {
    if (!loop) return
    const el = scrollRef.current
    if (!el) return

    const sectionWidth = el.scrollWidth / 3
    if (sectionWidth === 0) return

    if (el.scrollLeft >= sectionWidth * 2) {
      el.scrollLeft -= sectionWidth
      virtualScrollLeft.current = el.scrollLeft
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += sectionWidth
      virtualScrollLeft.current = el.scrollLeft
    }
  }, [loop])

  useEffect(() => {
    if (!loop || !scrollRef.current) return
    const el = scrollRef.current
    const initialPos = el.scrollWidth / 3
    el.scrollLeft = initialPos
    virtualScrollLeft.current = initialPos
    updateScrollState()
  }, [loop, updateScrollState])

  useEffect(() => {
    if (!autoScroll) return

    const el = scrollRef.current
    lastTimeRef.current = performance.now()

    const step = (now) => {
      if (!lastTimeRef.current) lastTimeRef.current = now
      const delta = Math.min(now - lastTimeRef.current, 50)
      lastTimeRef.current = now

      if (!isPausedRef.current && !isDraggingRef.current) {
        virtualScrollLeft.current += autoScrollSpeed * delta
        el.scrollLeft = virtualScrollLeft.current
        normalizeScroll()
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [autoScroll, autoScrollSpeed, normalizeScroll])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        lastTimeRef.current = null
      } else {
        lastTimeRef.current = performance.now()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  const handleMouseDown = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    isDraggingRef.current = true
    dragRef.current = {
      startX: e.pageX,
      startY: 0,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
      directionDecided: true,
      isHorizontal: true
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !dragRef.current.isHorizontal) return
    const el = scrollRef.current
    if (!el) return

    const diff = e.pageX - dragRef.current.startX
    if (Math.abs(diff) > 3) {
      dragRef.current.hasMoved = true
      e.preventDefault()
    }

    el.scrollLeft = dragRef.current.scrollLeft - diff
    virtualScrollLeft.current = el.scrollLeft
    normalizeScroll()
  }, [normalizeScroll])

  const handleMouseUpOrLeave = useCallback(() => {
    isDraggingRef.current = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
  }, [])

  const handleTouchStart = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    isDraggingRef.current = true
    dragRef.current = {
      startX: e.touches[0].pageX,
      startY: e.touches[0].pageY,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
      directionDecided: false,
      isHorizontal: false
    }
    onTouchStart?.(e)
  }, [onTouchStart])

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    const el = scrollRef.current
    if (!el) return

    const touch = e.touches[0]

    if (!dragRef.current.directionDecided) {
      const dx = Math.abs(touch.pageX - dragRef.current.startX)
      const dy = Math.abs(touch.pageY - dragRef.current.startY)
      if (dx + dy < 5) return
      dragRef.current.directionDecided = true
      dragRef.current.isHorizontal = dx > dy
    }

    if (dragRef.current.isHorizontal) {
      const diff = touch.pageX - dragRef.current.startX
      if (Math.abs(diff) > 3) dragRef.current.hasMoved = true
      el.scrollLeft = dragRef.current.scrollLeft - diff
      virtualScrollLeft.current = el.scrollLeft
      normalizeScroll()
      if (e.cancelable) e.preventDefault()
    }

    onTouchMove?.(e)
  }, [normalizeScroll, onTouchMove])

  const handleTouchEnd = useCallback((e) => {
    isDraggingRef.current = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
    onTouchEnd?.(e)
  }, [onTouchEnd])

  const handleClickCapture = useCallback((e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current.hasMoved = false
    }
  }, [])

  const handleMouseEnter = useCallback((e) => {
    if (autoScroll) isPausedRef.current = true
    onMouseEnter?.(e)
  }, [autoScroll, onMouseEnter])

  const handleMouseLeaveProp = useCallback((e) => {
    handleMouseUpOrLeave()
    if (autoScroll) isPausedRef.current = false
    onMouseLeave?.(e)
  }, [autoScroll, handleMouseUpOrLeave, onMouseLeave])

  let maskStyle = undefined
  if (showEdgeFade) {
    let maskImage = null
    if (canScrollLeft && canScrollRight) {
      maskImage = "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
    } else if (canScrollLeft) {
      maskImage = "linear-gradient(to right, transparent, black 40px, black 100%)"
    } else if (canScrollRight) {
      maskImage = "linear-gradient(to left, transparent, black 40px, black 100%)"
    }
    if (maskImage) {
      maskStyle = { maskImage, WebkitMaskImage: maskImage }
    }
  }

  return (
    <div style={maskStyle} className="w-full">
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseLeaveProp}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={`flex overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing ${className}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
    </div>
  )
})

export default DragScrollRow
