import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect, Children } from "react"

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
  const containerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  
  const stateRef = useRef({
    isDown: false,
    isHovered: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
    virtualScroll: 0,
    touchX: 0,
    touchY: 0,
    isHorizontalTouch: null
  })

  useImperativeHandle(ref, () => scrollRef.current)

  const updateMask = useCallback(() => {
    if (!showEdgeFade || !scrollRef.current || !containerRef.current) return
    const el = scrollRef.current
    const { scrollLeft, scrollWidth, clientWidth } = el
    
    const canScrollLeft = scrollLeft > 2
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 2
    let maskImage = "none"

    if (canScrollLeft && canScrollRight) {
      maskImage = "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
    } else if (canScrollLeft) {
      maskImage = "linear-gradient(to right, transparent, black 40px)"
    } else if (canScrollRight) {
      maskImage = "linear-gradient(to left, transparent, black 40px)"
    } else {
      maskImage = "none"
    }

    containerRef.current.style.maskImage = maskImage
    containerRef.current.style.webkitMaskImage = maskImage
  }, [showEdgeFade])

  const normalizeLoop = useCallback(() => {
    if (!loop || !scrollRef.current) return
    const el = scrollRef.current
    const halfWidth = el.scrollWidth / 2

    if (el.scrollLeft >= halfWidth) {
      el.scrollLeft -= halfWidth
      stateRef.current.virtualScroll = el.scrollLeft
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += halfWidth
      stateRef.current.virtualScroll = el.scrollLeft
    }
  }, [loop])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      updateMask()
      if (!autoScroll && !stateRef.current.isDown) {
        normalizeLoop()
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    const ro = new ResizeObserver(() => {
      updateMask()
    })
    ro.observe(el)

    updateMask()

    return () => {
      el.removeEventListener("scroll", handleScroll)
      ro.disconnect()
    }
  }, [updateMask, normalizeLoop, autoScroll])

  useEffect(() => {
    if (!autoScroll) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const el = scrollRef.current
    if (!el) return

    const tick = (now) => {
      if (!lastTimeRef.current) lastTimeRef.current = now
      const delta = Math.min(now - lastTimeRef.current, 50)
      lastTimeRef.current = now

      if (!stateRef.current.isDown && !stateRef.current.isHovered) {
        stateRef.current.virtualScroll += autoScrollSpeed * delta
        el.scrollLeft = stateRef.current.virtualScroll
        normalizeLoop()
      } else {
        stateRef.current.virtualScroll = el.scrollLeft
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [autoScroll, autoScrollSpeed, normalizeLoop])

  const handlePointerDown = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return

    const isTouch = e.type === "touchstart"
    const clientX = isTouch ? e.touches[0].clientX : e.clientX
    const clientY = isTouch ? e.touches[0].clientY : e.clientY

    stateRef.current.isDown = true
    stateRef.current.hasMoved = false
    stateRef.current.startX = clientX
    stateRef.current.touchY = clientY
    stateRef.current.scrollLeft = el.scrollLeft
    stateRef.current.isHorizontalTouch = null
    stateRef.current.virtualScroll = el.scrollLeft

    if (isTouch) {
      props.onTouchStart?.(e)
    }
  }, [props])

  const handlePointerMove = useCallback((e) => {
    if (!stateRef.current.isDown) return
    const el = scrollRef.current
    if (!el) return

    const isTouch = e.type === "touchmove"
    const clientX = isTouch ? e.touches[0].clientX : e.clientX
    const clientY = isTouch ? e.touches[0].clientY : e.clientY

    if (isTouch && stateRef.current.isHorizontalTouch === null) {
      const dx = Math.abs(clientX - stateRef.current.startX)
      const dy = Math.abs(clientY - stateRef.current.touchY)
      if (dx + dy < 5) return
      stateRef.current.isHorizontalTouch = dx > dy
    }

    if (isTouch && !stateRef.current.isHorizontalTouch) {
      return
    }

    const walk = clientX - stateRef.current.startX
    if (Math.abs(walk) > 5) {
      stateRef.current.hasMoved = true
    }

    el.scrollLeft = stateRef.current.scrollLeft - walk
    stateRef.current.virtualScroll = el.scrollLeft

    if (!isTouch) {
      e.preventDefault()
    } else {
      props.onTouchMove?.(e)
    }
  }, [props])

  const handlePointerUp = useCallback((e) => {
    stateRef.current.isDown = false
    stateRef.current.isHorizontalTouch = null
    normalizeLoop()
    
    if (e.type === "touchend") {
      props.onTouchEnd?.(e)
    }
  }, [normalizeLoop, props])

  const handleMouseLeave = useCallback((e) => {
    stateRef.current.isDown = false
    stateRef.current.isHovered = false
    normalizeLoop()
    props.onMouseLeave?.(e)
  }, [normalizeLoop, props])

  const handleMouseEnter = useCallback((e) => {
    stateRef.current.isHovered = true
    if (scrollRef.current) {
      stateRef.current.virtualScroll = scrollRef.current.scrollLeft
    }
    props.onMouseEnter?.(e)
  }, [props])

  const handleClickCapture = useCallback((e) => {
    if (stateRef.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      stateRef.current.hasMoved = false
    }
  }, [])

  return (
    <div ref={containerRef} style={{ display: "flex", width: "100%" }}>
      <div
        ref={scrollRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={`flex overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing ${className}`}
        style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex shrink-0">
          {children}
        </div>
        {loop && (
          <div className="flex shrink-0" aria-hidden="true">
            {children}
          </div>
        )}
      </div>
    </div>
  )
})

export default DragScrollRow
