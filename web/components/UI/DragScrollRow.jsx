import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle, Children, cloneElement } from "react"

const DragScrollRow = forwardRef(function DragScrollRow({
  children,
  className = "",
  gap = 0,
  autoScroll = false,
  autoScrollSpeed = 1,
  loop = false,
  showEdgeFade = true,
  ...props
}, ref) {
  const containerRef = useRef(null)
  const [canScroll, setCanScroll] = useState({ left: false, right: false })
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 })
  const autoScrollState = useRef({ rafId: null, isPaused: false })
  const scrollCheckRaf = useRef(null)

  useImperativeHandle(ref, () => containerRef.current, [])

  const childArray = Children.toArray(children)

  const checkScrollPosition = useCallback(() => {
    const el = containerRef.current
    if (!el || loop) return

    const left = el.scrollLeft > 1
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1

    setCanScroll(prev => 
      prev.left !== left || prev.right !== right 
        ? { left, right } 
        : prev
    )
  }, [loop])

  const handlePointerDown = useCallback((e) => {
    const el = containerRef.current
    if (!el) return

    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft
    }
    el.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragState.current.isDragging) return
    
    const el = containerRef.current
    if (!el) return

    const delta = e.clientX - dragState.current.startX
    el.scrollLeft = dragState.current.scrollLeft - delta
  }, [])

  const handlePointerUp = useCallback((e) => {
    dragState.current.isDragging = false
    containerRef.current?.releasePointerCapture(e.pointerId)
  }, [])

  useEffect(() => {
    if (!loop) return

    const el = containerRef.current
    if (!el) return

    const resetPosition = () => {
      const sectionWidth = el.scrollWidth / 3
      el.scrollLeft = sectionWidth
    }

    resetPosition()

    const handleScroll = () => {
      const sectionWidth = el.scrollWidth / 3
      if (el.scrollLeft < 1 || el.scrollLeft >= sectionWidth * 2 - 1) {
        el.scrollLeft = sectionWidth + (el.scrollLeft % sectionWidth)
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [loop, childArray.length])

  useEffect(() => {
    if (!autoScroll) return

    const el = containerRef.current
    if (!el) return

    const state = autoScrollState.current

    const step = () => {
      if (!state.isPaused && !dragState.current.isDragging) {
        el.scrollLeft += autoScrollSpeed
      }
      state.rafId = requestAnimationFrame(step)
    }

    const pause = () => { state.isPaused = true }
    const resume = () => { state.isPaused = false }

    el.addEventListener("pointerenter", pause)
    el.addEventListener("pointerleave", resume)
    state.rafId = requestAnimationFrame(step)

    return () => {
      if (state.rafId) cancelAnimationFrame(state.rafId)
      el.removeEventListener("pointerenter", pause)
      el.removeEventListener("pointerleave", resume)
    }
  }, [autoScroll, autoScrollSpeed])

  useEffect(() => {
    if (loop || !showEdgeFade) return

    const el = containerRef.current
    if (!el) return

    checkScrollPosition()

    const handleScroll = () => {
      if (scrollCheckRaf.current) return
      scrollCheckRaf.current = requestAnimationFrame(() => {
        checkScrollPosition()
        scrollCheckRaf.current = null
      })
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", checkScrollPosition)

    return () => {
      el.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", checkScrollPosition)
      if (scrollCheckRaf.current) cancelAnimationFrame(scrollCheckRaf.current)
    }
  }, [checkScrollPosition, showEdgeFade, loop])

  const maskStyle = (() => {
    if (!showEdgeFade || loop) return undefined

    const { left, right } = canScroll
    const fade = "40px"

    if (left && right) {
      return {
        maskImage: `linear-gradient(90deg, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent)`,
        WebkitMaskImage: `linear-gradient(90deg, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent)`,
      }
    }
    if (left) {
      return {
        maskImage: `linear-gradient(90deg, transparent, #000 ${fade})`,
        WebkitMaskImage: `linear-gradient(90deg, transparent, #000 ${fade})`,
      }
    }
    if (right) {
      return {
        maskImage: `linear-gradient(270deg, transparent, #000 ${fade})`,
        WebkitMaskImage: `linear-gradient(270deg, transparent, #000 ${fade})`,
      }
    }
    return undefined
  })()

  const containerStyle = {
    display: "flex",
    overflowX: "auto",
    overflowY: "hidden",
    cursor: "grab",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    gap: gap || undefined,
  }

  const wrapperStyle = {
    width: "100%",
    overflow: "hidden",
    ...maskStyle,
  }

  return (
    <div style={wrapperStyle} {...props}>
      <style>{`[data-drag-scroll]::-webkit-scrollbar{display:none}`}</style>
      <div
        ref={containerRef}
        data-drag-scroll
        className={className}
        style={containerStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {loop ? (
          <>
            {childArray.map((child, i) => cloneElement(child, { key: `a-${i}` }))}
            {childArray.map((child, i) => cloneElement(child, { key: `b-${i}` }))}
            {childArray.map((child, i) => cloneElement(child, { key: `c-${i}` }))}
          </>
        ) : (
          children
        )}
      </div>
    </div>
  )
})

export default DragScrollRow
