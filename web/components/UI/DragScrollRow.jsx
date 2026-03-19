import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react"
import useEmblaCarousel from "embla-carousel-react"
import AutoScrollPlugin from "embla-carousel-auto-scroll"

const DragScrollRow = forwardRef(function DragScrollRow({
  children,
  className = "",
  autoScroll = false,
  autoScrollSpeed = 1,
  loop = false,
  showEdgeFade = true,
  gap = 0,
  ...props
}, ref) {
  const [scrollState, setScrollState] = useState({ left: false, right: false })
  const rafRef = useRef(null)
  const lastStateRef = useRef({ left: false, right: false })

  const plugins = useMemo(() => {
    if (!autoScroll) return []
    return [
      AutoScrollPlugin({
        speed: autoScrollSpeed,
        playOnInit: true,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  }, [autoScroll, autoScrollSpeed])

  const options = useMemo(() => ({
    loop,
    dragFree: true,
    containScroll: loop ? false : "trimSnaps",
    align: "start",
  }), [loop])

  const [emblaRef, emblaApi] = useEmblaCarousel(options, plugins)

  useImperativeHandle(ref, () => emblaApi, [emblaApi])

  const updateScrollState = useCallback(() => {
    if (!emblaApi || !showEdgeFade || loop) return

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const nextLeft = emblaApi.canScrollPrev()
      const nextRight = emblaApi.canScrollNext()

      if (
        lastStateRef.current.left !== nextLeft ||
        lastStateRef.current.right !== nextRight
      ) {
        lastStateRef.current = { left: nextLeft, right: nextRight }
        setScrollState({ left: nextLeft, right: nextRight })
      }
    })
  }, [emblaApi, showEdgeFade, loop])

  useEffect(() => {
    if (!emblaApi || loop || !showEdgeFade) return

    updateScrollState()

    emblaApi.on("scroll", updateScrollState)
    emblaApi.on("reInit", updateScrollState)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      emblaApi.off("scroll", updateScrollState)
      emblaApi.off("reInit", updateScrollState)
    }
  }, [emblaApi, showEdgeFade, loop, updateScrollState])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const maskStyle = useMemo(() => {
    if (!showEdgeFade || loop) return undefined

    const { left, right } = scrollState

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
  }, [showEdgeFade, loop, scrollState])

  const containerStyle = useMemo(() => {
    if (!gap) return undefined
    return { gap: `${gap}px` }
  }, [gap])

  return (
    <div style={maskStyle} className="w-full" {...props}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className={`flex ${className}`} style={containerStyle}>
          {children}
        </div>
      </div>
    </div>
  )
})

export default DragScrollRow
