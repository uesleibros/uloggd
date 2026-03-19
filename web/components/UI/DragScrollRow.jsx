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
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const animationRef = useRef(null)
  const autoScrollRef = useRef(null)

  useImperativeHandle(ref, () => containerRef.current, [])

  const childArray = Children.toArray(children)

  const renderChildren = () => {
    if (!loop) return children

    return (
      <>
        {childArray.map((child, i) => cloneElement(child, { key: `clone-start-${i}` }))}
        {childArray.map((child, i) => cloneElement(child, { key: `original-${i}` }))}
        {childArray.map((child, i) => cloneElement(child, { key: `clone-end-${i}` }))}
      </>
    )
  }

  const checkScrollPosition = useCallback(() => {
    const el = containerRef.current
    if (!el || loop) return

    const newLeft = el.scrollLeft > 1
    const newRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1

    setCanScroll(prev => {
      if (prev.left !== newLeft || prev.right !== newRight) {
        return { left: newLeft, right: newRight }
      }
      return prev
    })
  }, [loop])

  const handleMouseDown = (e) => {
    isDragging.current = true
    startX.current = e.pageX - containerRef.current.offsetLeft
    scrollLeft.current = containerRef.current.scrollLeft
    containerRef.current.style.cursor = "grabbing"
    containerRef.current.style.userSelect = "none"
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    containerRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseUp = () => {
    isDragging.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab"
      containerRef.current.style.userSelect = ""
    }
  }

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].pageX
    scrollLeft.current = containerRef.current.scrollLeft
  }

  const handleTouchMove = (e) => {
    const x = e.touches[0].pageX
    const walk = (x - startX.current) * 1.5
    containerRef.current.scrollLeft = scrollLeft.current - walk
  }

  useEffect(() => {
    if (!loop) return

    const el = containerRef.current
    if (!el) return

    const sectionWidth = el.scrollWidth / 3
    el.scrollLeft = sectionWidth
  }, [loop, children])

  useEffect(() => {
    if (!loop) return

    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      const sectionWidth = el.scrollWidth / 3

      if (el.scrollLeft <= 0) {
        el.scrollLeft = sectionWidth
      } else if (el.scrollLeft >= sectionWidth * 2) {
        el.scrollLeft = sectionWidth
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [loop])

  useEffect(() => {
    if (!autoScroll) return

    const el = containerRef.current
    if (!el) return

    let isPaused = false

    const step = () => {
      if (!isPaused) {
        el.scrollLeft += autoScrollSpeed
      }
      autoScrollRef.current = requestAnimationFrame(step)
    }

    const pause = () => { isPaused = true }
    const resume = () => { isPaused = false }

    el.addEventListener("mouseenter", pause)
    el.addEventListener("mouseleave", resume)

    autoScrollRef.current = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(autoScrollRef.current)
      el.removeEventListener("mouseenter", pause)
      el.removeEventListener("mouseleave", resume)
    }
  }, [autoScroll, autoScrollSpeed])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !showEdgeFade || loop) return

    checkScrollPosition()

    const handleScroll = () => {
      if (animationRef.current) return
      animationRef.current = requestAnimationFrame(() => {
        checkScrollPosition()
        animationRef.current = null
      })
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", checkScrollPosition)

    return () => {
      el.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", checkScrollPosition)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [checkScrollPosition, showEdgeFade, loop])

  const getMaskStyle = () => {
    if (!showEdgeFade || loop) return undefined

    const { left, right } = canScroll

    if (left && right) {
      return {
        maskImage: "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)",
      }
    }
    if (left) {
      return {
        maskImage: "linear-gradient(to right, transparent, black 40px, black 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 40px, black 100%)",
      }
    }
    if (right) {
      return {
        maskImage: "linear-gradient(to left, transparent, black 40px, black 100%)",
        WebkitMaskImage: "linear-gradient(to left, transparent, black 40px, black 100%)",
      }
    }
    return undefined
  }

  return (
    <div style={getMaskStyle()} className="w-full" {...props}>
      <div
        ref={containerRef}
        className={`flex overflow-x-auto scrollbar-none cursor-grab ${className}`}
        style={{ gap: gap ? `${gap}px` : undefined }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {renderChildren()}
      </div>
    </div>
  )
})

export default DragScrollRow
