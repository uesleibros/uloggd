import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useState, Children, cloneElement } from "react"

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
  const isNormalizingRef = useRef(false)
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

  const shouldShowFade = showEdgeFade && !loop

  const checkScroll = useCallback(() => {
    if (!shouldShowFade) return
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [shouldShowFade])

  useEffect(() => {
    if (!shouldShowFade) return
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
  }, [shouldShowFade, checkScroll, children])

  const getContentWidth = useCallback(() => {
    const el = scrollRef.current
    if (!el || !loop) return 0
    return el.scrollWidth / 3
  }, [loop])

  const normalizeScroll = useCallback(() => {
    if (!loop) return
    const el = scrollRef.current
    if (!el) return
    
    const contentWidth = getContentWidth()
    if (contentWidth === 0) return

    isNormalizingRef.current = true

    if (virtualScrollLeft.current >= contentWidth * 2) {
      virtualScrollLeft.current -= contentWidth
      el.scrollLeft = virtualScrollLeft.current
    } else if (virtualScrollLeft.current <= 0) {
      virtualScrollLeft.current += contentWidth
      el.scrollLeft = virtualScrollLeft.current
    }

    isNormalizingRef.current = false
  }, [loop, getContentWidth])

  const syncVirtualScroll = useCallback(() => {
    if (scrollRef.current && !isNormalizingRef.current) {
      virtualScrollLeft.current = scrollRef.current.scrollLeft
    }
  }, [])

  useEffect(() => {
    if (!loop || !scrollRef.current) return
    const el = scrollRef.current
    
    const initScroll = () => {
      const contentWidth = el.scrollWidth / 3
      if (contentWidth > 0) {
        el.scrollLeft = contentWidth
        virtualScrollLeft.current = contentWidth
      }
    }

    initScroll()
    
    const timer = setTimeout(initScroll, 50)
    return () => clearTimeout(timer)
  }, [loop, children])

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
        el.scrollLeft = virtualScrollLeft.current
        normalizeScroll()
      } else {
        el.scrollLeft += autoScrollSpeed * delta
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
          el.scrollLeft = 0
        }
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
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
    if (!loop) return

    const handleResize = () => {
      if (window.innerWidth === windowWidthRef.current) return
      windowWidthRef.current = window.innerWidth
      const el = scrollRef.current
      if (!el) return
      const contentWidth = el.scrollWidth / 3
      el.scrollLeft = contentWidth
      virtualScrollLeft.current = contentWidth
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [loop])

  const pause = useCallback(() => {
    isPausedRef.current = true
    syncVirtualScroll()
  }, [syncVirtualScroll])

  const resume = useCallback(() => {
    syncVirtualScroll()
    if (loop) normalizeScroll()
    lastTimeRef.current = null
    isPausedRef.current = false
  }, [syncVirtualScroll, loop, normalizeScroll])

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
    const newScrollLeft = dragRef.current.scrollLeft - diff
    el.scrollLeft = newScrollLeft
    if (loop) {
      virtualScrollLeft.current = newScrollLeft
      normalizeScroll()
    }
  }, [loop, normalizeScroll])

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDown = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
  }, [])

  const handleTouchStart = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    if (autoScroll) pause()
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
  }, [props, autoScroll, pause])

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
    }

    if (dragRef.current.isHorizontal) {
      const diff = touch.pageX - dragRef.current.startX
      if (Math.abs(diff) > 5) dragRef.current.hasMoved = true
      const newScrollLeft = dragRef.current.scrollLeft - diff
      el.scrollLeft = newScrollLeft
      if (loop) {
        virtualScrollLeft.current = newScrollLeft
      }
    }

    props.onTouchMove?.(e)
  }, [props, loop])

  const handleTouchEnd = useCallback((e) => {
    dragRef.current.isDown = false
    dragRef.current.directionDecided = false
    dragRef.current.isHorizontal = false
    
    if (autoScroll) {
      setTimeout(resume, 150)
    }
    
    props.onTouchEnd?.(e)
  }, [props, autoScroll, resume])

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
  }, [autoScroll, pause, props])

  const handleMouseLeave = useCallback((e) => {
    handleMouseUp()
    if (autoScroll) {
      setTimeout(resume, 150)
    }
    props.onMouseLeave?.(e)
  }, [handleMouseUp, autoScroll, resume, props])

  let maskStyle = undefined
  if (shouldShowFade) {
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

  const renderContent = () => {
    if (!loop) return children

    const childArray = Children.toArray(children)
    
    return (
      <>
        {childArray.map((child, i) => 
          cloneElement(child, { key: `loop-1-${child.key || i}` })
        )}
        {childArray.map((child, i) => 
          cloneElement(child, { key: `loop-2-${child.key || i}` })
        )}
        {childArray.map((child, i) => 
          cloneElement(child, { key: `loop-3-${child.key || i}` })
        )}
      </>
    )
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
        {renderContent()}
      </div>
    </div>
  )
})

export default DragScrollRow