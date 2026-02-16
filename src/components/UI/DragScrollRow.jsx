import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useState } from "react"

const DragScrollRow = forwardRef(function DragScrollRow({ 
  children, 
  className = "", 
  autoScroll = false,
  autoScrollSpeed = 0.04,
  loop = false,
  ...props 
}, ref) {
  const scrollRef = useRef(null)
  const rafRef = useRef(null)
  const virtualScrollLeft = useRef(0)
  const windowWidthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 0)
  const lastScrollWidth = useRef(0)
  const [isPaused, setIsPaused] = useState(false)

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

  const syncVirtualScroll = useCallback(() => {
    if (scrollRef.current) {
      virtualScrollLeft.current = scrollRef.current.scrollLeft
    }
  }, [])

  const initializeScrollPosition = useCallback(() => {
    if (!loop || !scrollRef.current) return
    const el = scrollRef.current
    if (el.scrollWidth === lastScrollWidth.current) return
    lastScrollWidth.current = el.scrollWidth
    const initialPos = el.scrollWidth / 3
    el.scrollLeft = initialPos
    virtualScrollLeft.current = initialPos
  }, [loop])

  useEffect(() => {
    if (!autoScroll || !loop || !scrollRef.current) return
    initializeScrollPosition()
  }, [autoScroll, loop, children, initializeScrollPosition])

  useEffect(() => {
    if (!loop || !scrollRef.current) return
    
    const el = scrollRef.current
    const observer = new ResizeObserver(() => {
      initializeScrollPosition()
    })
    
    observer.observe(el)
    
    return () => observer.disconnect()
  }, [loop, initializeScrollPosition])

  useEffect(() => {
    if (!autoScroll || isPaused || !scrollRef.current) return

    let lastTime = performance.now()

    function step(now) {
      const delta = now - lastTime
      lastTime = now
      const el = scrollRef.current
      if (!el) return

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
    return () => cancelAnimationFrame(rafRef.current)
  }, [autoScroll, isPaused, autoScrollSpeed, loop, normalizeScroll])

  useEffect(() => {
    if (!autoScroll) return
    const handleVisibility = () => setIsPaused(document.hidden)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [autoScroll])

  useEffect(() => {
    if (!autoScroll || !loop) return

    const handleResize = () => {
      if (window.innerWidth === windowWidthRef.current) return
      windowWidthRef.current = window.innerWidth
      lastScrollWidth.current = 0
      initializeScrollPosition()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [autoScroll, loop, initializeScrollPosition])

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
    if (autoScroll) setIsPaused(true)
  }, [autoScroll])

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
    
    if (loop) {
      normalizeScroll()
    }
  }, [loop, normalizeScroll])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.isDown && autoScroll) {
      syncVirtualScroll()
      normalizeScroll()
      setTimeout(() => setIsPaused(false), 100)
    }
    dragRef.current.isDown = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
  }, [autoScroll, syncVirtualScroll, normalizeScroll])

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
      if (dragRef.current.isHorizontal && autoScroll) setIsPaused(true)
    }

    if (dragRef.current.isHorizontal) {
      const diff = touch.pageX - dragRef.current.startX
      if (Math.abs(diff) > 5) dragRef.current.hasMoved = true
      el.scrollLeft = dragRef.current.scrollLeft - diff
      
      if (loop) {
        normalizeScroll()
      }
    }

    props.onTouchMove?.(e)
  }, [props.onTouchMove, autoScroll, loop, normalizeScroll])

  const handleTouchEnd = useCallback((e) => {
    if (dragRef.current.isHorizontal && autoScroll) {
      syncVirtualScroll()
      normalizeScroll()
      setTimeout(() => setIsPaused(false), 100)
    }
    dragRef.current.isDown = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
    props.onTouchEnd?.(e)
  }, [props.onTouchEnd, autoScroll, syncVirtualScroll, normalizeScroll])

  const handleClickCapture = useCallback((e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current.hasMoved = false
    }
  }, [])

  const handleMouseEnter = useCallback((e) => {
    if (autoScroll) setIsPaused(true)
    props.onMouseEnter?.(e)
  }, [autoScroll, props.onMouseEnter])

  const handleMouseLeave = useCallback((e) => {
    handleMouseUp()
    if (autoScroll) {
      syncVirtualScroll()
      setIsPaused(false)
    }
    props.onMouseLeave?.(e)
  }, [autoScroll, handleMouseUp, syncVirtualScroll, props.onMouseLeave])

  return (
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
  )
})

export default DragScrollRow