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
  const lastTimeRef = useRef(0)
  const initializedRef = useRef(false)

  const isPausedRef = useRef(false)
  const isDraggingRef = useRef(false)

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    hasMoved: false,
    directionLocked: false,
    isHorizontal: false,
  })

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useImperativeHandle(ref, () => scrollRef.current)

  const getSectionWidth = useCallback(() => {
    const el = scrollRef.current
    if (!el || !loop) return 0
    return el.scrollWidth / 3
  }, [loop])

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el || !showEdgeFade) return

    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [showEdgeFade])

  const normalizeLoopPosition = useCallback(() => {
    if (!loop) return
    const el = scrollRef.current
    if (!el) return

    const sectionWidth = getSectionWidth()
    if (!sectionWidth) return

    if (el.scrollLeft < sectionWidth * 0.5) {
      el.scrollLeft += sectionWidth
    } else if (el.scrollLeft > sectionWidth * 1.5) {
      el.scrollLeft -= sectionWidth
    }
  }, [loop, getSectionWidth])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      if (loop && !isDraggingRef.current) {
        normalizeLoopPosition()
      }
      updateScrollState()
    }

    el.addEventListener("scroll", onScroll, { passive: true })

    const ro = new ResizeObserver(() => {
      if (loop && !initializedRef.current) {
        requestAnimationFrame(() => {
          const sectionWidth = getSectionWidth()
          if (sectionWidth) {
            el.scrollLeft = sectionWidth
            initializedRef.current = true
            updateScrollState()
          }
        })
      } else {
        updateScrollState()
      }
    })

    ro.observe(el)

    requestAnimationFrame(() => {
      if (loop) {
        const sectionWidth = getSectionWidth()
        if (sectionWidth) {
          el.scrollLeft = sectionWidth
          initializedRef.current = true
        }
      }
      updateScrollState()
    })

    return () => {
      el.removeEventListener("scroll", onScroll)
      ro.disconnect()
    }
  }, [loop, getSectionWidth, normalizeLoopPosition, updateScrollState])

  useEffect(() => {
    if (!autoScroll) return

    const step = (time) => {
      const el = scrollRef.current
      if (!el) {
        rafRef.current = requestAnimationFrame(step)
        return
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = time
      }

      const delta = Math.min(time - lastTimeRef.current, 32)
      lastTimeRef.current = time

      if (!isPausedRef.current && !isDraggingRef.current) {
        el.scrollLeft += autoScrollSpeed * delta
        if (loop) normalizeLoopPosition()
        updateScrollState()
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimeRef.current = 0
    }
  }, [autoScroll, autoScrollSpeed, loop, normalizeLoopPosition, updateScrollState])

  useEffect(() => {
    const handleVisibility = () => {
      lastTimeRef.current = 0
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  const stopDragging = useCallback(() => {
    isDraggingRef.current = false
    dragRef.current.directionLocked = false
    dragRef.current.isHorizontal = false
  }, [])

  const handleMouseDown = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return

    isDraggingRef.current = true
    isPausedRef.current = true

    dragRef.current = {
      startX: e.pageX,
      startY: e.pageY,
      startScrollLeft: el.scrollLeft,
      hasMoved: false,
      directionLocked: true,
      isHorizontal: true,
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !dragRef.current.isHorizontal) return

    const el = scrollRef.current
    if (!el) return

    const dx = e.pageX - dragRef.current.startX

    if (Math.abs(dx) > 3) {
      dragRef.current.hasMoved = true
      e.preventDefault()
    }

    el.scrollLeft = dragRef.current.startScrollLeft - dx
    if (loop) normalizeLoopPosition()
    updateScrollState()
  }, [loop, normalizeLoopPosition, updateScrollState])

  const handleMouseUp = useCallback(() => {
    stopDragging()
    if (autoScroll) isPausedRef.current = false
  }, [autoScroll, stopDragging])

  const handleTouchStart = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return

    isDraggingRef.current = true
    isPausedRef.current = true

    dragRef.current = {
      startX: e.touches[0].pageX,
      startY: e.touches[0].pageY,
      startScrollLeft: el.scrollLeft,
      hasMoved: false,
      directionLocked: false,
      isHorizontal: false,
    }

    onTouchStart?.(e)
  }, [onTouchStart])

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current) return

    const el = scrollRef.current
    if (!el) return

    const touch = e.touches[0]
    const dx = touch.pageX - dragRef.current.startX
    const dy = touch.pageY - dragRef.current.startY

    if (!dragRef.current.directionLocked) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return
      dragRef.current.directionLocked = true
      dragRef.current.isHorizontal = Math.abs(dx) > Math.abs(dy)
    }

    if (!dragRef.current.isHorizontal) {
      onTouchMove?.(e)
      return
    }

    if (Math.abs(dx) > 3) {
      dragRef.current.hasMoved = true
    }

    el.scrollLeft = dragRef.current.startScrollLeft - dx
    if (loop) normalizeLoopPosition()
    updateScrollState()

    if (e.cancelable) e.preventDefault()

    onTouchMove?.(e)
  }, [loop, normalizeLoopPosition, onTouchMove, updateScrollState])

  const handleTouchEnd = useCallback((e) => {
    stopDragging()
    if (autoScroll) isPausedRef.current = false
    onTouchEnd?.(e)
  }, [autoScroll, onTouchEnd, stopDragging])

  const handleClickCapture = useCallback((e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current.hasMoved = false
    }
  }, [])

  const handleMouseEnterInternal = useCallback((e) => {
    if (autoScroll) isPausedRef.current = true
    onMouseEnter?.(e)
  }, [autoScroll, onMouseEnter])

  const handleMouseLeaveInternal = useCallback((e) => {
    stopDragging()
    if (autoScroll) isPausedRef.current = false
    onMouseLeave?.(e)
  }, [autoScroll, onMouseLeave, stopDragging])

  let maskStyle
  if (showEdgeFade) {
    let maskImage = null

    if (canScrollLeft && canScrollRight) {
      maskImage = "linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent)"
    } else if (canScrollLeft) {
      maskImage = "linear-gradient(to right, transparent, black 32px, black 100%)"
    } else if (canScrollRight) {
      maskImage = "linear-gradient(to left, transparent, black 32px, black 100%)"
    }

    if (maskImage) {
      maskStyle = {
        maskImage,
        WebkitMaskImage: maskImage,
      }
    }
  }

  return (
    <div style={maskStyle} className="w-full">
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeaveInternal}
        onMouseEnter={handleMouseEnterInternal}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={`flex overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing ${className}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        {...props}
      >
        {children}
      </div>
    </div>
  )
})

export default DragScrollRow
