import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useState } from "react"

const DragScrollRow = forwardRef(function DragScrollRow({ 
  children, 
  className = "", 
  autoScroll = false,
  autoScrollSpeed = 0.04,
  loop = false,
  showEdgeFade = true,
  ...props 
}, ref) {
  const scrollRef = useRef(null)
  const rafRef = useRef(null)
  const virtualScrollLeft = useRef(0)
  const lastTimeRef = useRef(null)
  const windowWidthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 0)
  const isPausedRef = useRef(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const dragRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    hasMoved: false,
    directionDecided: false,
    isHorizontal: false
  })

  useImperativeHandle(ref, () => scrollRef.current)

  const checkScroll = useCallback(() => {
    if (!showEdgeFade) return
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [showEdgeFade])

  useEffect(() => {
    if (!showEdgeFade) return
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      ro.disconnect()
    }
  }, [showEdgeFade, checkScroll, children])

  const normalizeScroll = useCallback(() => {
    if (!loop) return
    const el = scrollRef.current
    if (!el) return
    const sectionWidth = el.scrollWidth / 3
    if (sectionWidth === 0) return
    if (virtualScrollLeft.current >= sectionWidth * 2) {
      virtualScrollLeft.current -= sectionWidth
      el.scrollLeft = virtualScrollLeft.current
    } else if (virtualScrollLeft.current <= 0) {
      virtualScrollLeft.current += sectionWidth
      el.scrollLeft = virtualScrollLeft.current
    }
  }, [loop])

  const syncVirtualScroll = useCallback(() => {
    if (scrollRef.current) {
      virtualScrollLeft.current = scrollRef.current.scrollLeft
    }
  }, [])

  useEffect(() => {
    if (!autoScroll || !loop || !scrollRef.current) return
    const el = scrollRef.current
    const initialPos = el.scrollWidth / 3
    el.scrollLeft = initialPos
    virtualScrollLeft.current = initialPos
  }, [autoScroll, loop, children])

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return

    const el = scrollRef.current
    lastTimeRef.current = null

    function step(now) {
      if (isPausedRef.current) {
        lastTimeRef.current = null
        rafRef.current = requestAnimationFrame(step)
        return
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = now
        rafRef.current = requestAnimationFrame(step)
        return
      }

      const delta = Math.min(now - lastTimeRef.current, 32)
      lastTimeRef.current = now

      if (loop) {
        virtualScrollLeft.current += autoScrollSpeed * delta
        el.scrollLeft = Math.floor(virtualScrollLeft.current)
        normalizeScroll()
      } else {
        el.scrollLeft += autoScrollSpeed * delta
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [autoScroll, autoScrollSpeed, loop, normalizeScroll])

  useEffect(() => {
    if (!autoScroll) return

    const handleVisibility = () => {
      if (document.hidden) {
        isPausedRef.current = true
        syncVirtualScroll()
      } else {
        lastTimeRef.current = null
        isPausedRef.current = false
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [autoScroll, syncVirtualScroll])

  useEffect(() => {
    if (!autoScroll || !loop) return

    const handleResize = () => {
      if (window.innerWidth === windowWidthRef.current) return
      windowWidthRef.current = window.innerWidth
      const el = scrollRef.current
      if (!el) return
      const newPos = el.scrollWidth / 3
      el.scrollLeft = newPos
      virtualScrollLeft.current = newPos
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [autoScroll, loop])

  const pause = useCallback(() => {
    isPausedRef.current = true
    syncVirtualScroll()
  }, [syncVirtualScroll])

  const resume = useCallback(() => {
    lastTimeRef.current = null
    isPausedRef.current = false
  }, [])

  const handleMouseDown = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    dragRef.current = {
      isDown: true,
      startX: e.pageX,
      startY: 0,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
      directionDecided: true,
      isHorizontal: true
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current.isDown || !dragRef.current.isHorizontal) return
    const el = scrollRef.current
    if (!el) return
    const diff = e.pageX - dragRef.current.startX
    if (Math.abs(diff) > 5) {
      dragRef.current.hasMoved = true
      e.preventDefault()
    }
    el.scrollLeft = dragRef.current.scrollLeft - diff
  }, [])

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDown = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
  }, [])

  const handleTouchStart = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    const touch = e.touches[0]
    dragRef.current = {
      isDown: true,
      startX: touch.pageX,
      startY: touch.pageY,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
      directionDecided: false,
      isHorizontal: false
    }
    props.onTouchStart?.(e)
  }, [props.onTouchStart])

  const handleTouchMove = useCallback((e) => {
    if (!dragRef.current.isDown) return
    const el = scrollRef.current
    if (!el) return
    const touch = e.touches[0]

    if (!dragRef.current.directionDecided) {
      const dx = Math.abs(touch.pageX - dragRef.current.startX)
      const dy = Math.abs(touch.pageY - dragRef.current.startY)
      if (dx + dy < 10) return
      dragRef.current.directionDecided = true
      dragRef.current.isHorizontal = dx > dy
      if (dragRef.current.isHorizontal && autoScroll) pause()
    }

    if (dragRef.current.isHorizontal) {
      const diff = touch.pageX - dragRef.current.startX
      if (Math.abs(diff) > 5) dragRef.current.hasMoved = true
      el.scrollLeft = dragRef.current.scrollLeft - diff
    }

    props.onTouchMove?.(e)
  }, [props.onTouchMove, autoScroll, pause])

  const handleTouchEnd = useCallback((e) => {
    if (dragRef.current.isHorizontal && autoScroll) {
      syncVirtualScroll()
      normalizeScroll()
      setTimeout(resume, 100)
    }
    dragRef.current.isDown = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
    props.onTouchEnd?.(e)
  }, [props.onTouchEnd, autoScroll, syncVirtualScroll, normalizeScroll, resume])

  const handleClickCapture = useCallback((e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current.hasMoved = false
    }
  }, [])

  const handleMouseEnter = useCallback((e) => {
    if (autoScroll) pause()
    props.onMouseEnter?.(e)
  }, [autoScroll, pause, props.onMouseEnter])

  const handleMouseLeave = useCallback((e) => {
    handleMouseUp()
    if (autoScroll) {
      syncVirtualScroll()
      resume()
    }
    props.onMouseLeave?.(e)
  }, [autoScroll, handleMouseUp, syncVirtualScroll, resume, props.onMouseLeave])

  let maskStyle = undefined
  if (showEdgeFade) {
    let maskImage = null
    if (canScrollLeft && canScrollRight) {
      maskImage = "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
    } else if (canScrollLeft) {
      maskImage = "linear-gradient(to right, transparent, black 40px)"
    } else if (canScrollRight) {
      maskImage = "linear-gradient(to left, transparent, black 40px)"
    }
    if (maskImage) {
      maskStyle = { maskImage, WebkitMaskImage: maskImage }
    }
  }

  return (
    <div style={maskStyle}>
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={`flex overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing ${className}`}
      >
        {children}
      </div>
    </div>
  )
})

export default DragScrollRow
