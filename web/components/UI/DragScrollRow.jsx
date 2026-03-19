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
  ...props
}, ref) {
  const prevScrollStateRef = useRef({ left: false, right: false })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  useImperativeHandle(ref, () => emblaApi || null, [emblaApi])

  const updateScrollState = useCallback(() => {
    if (!emblaApi || !showEdgeFade) return

    const nextLeft = emblaApi.canScrollPrev()
    const nextRight = emblaApi.canScrollNext()

    if (
      prevScrollStateRef.current.left !== nextLeft ||
      prevScrollStateRef.current.right !== nextRight
    ) {
      prevScrollStateRef.current = { left: nextLeft, right: nextRight }
      setCanScrollLeft(nextLeft)
      setCanScrollRight(nextRight)
    }
  }, [emblaApi, showEdgeFade])

  useEffect(() => {
    if (!emblaApi) return
    if (!showEdgeFade) return

    updateScrollState()
    emblaApi.on("scroll", updateScrollState)
    emblaApi.on("reInit", updateScrollState)
    emblaApi.on("resize", updateScrollState)
    emblaApi.on("select", updateScrollState)

    return () => {
      emblaApi.off("scroll", updateScrollState)
      emblaApi.off("reInit", updateScrollState)
      emblaApi.off("resize", updateScrollState)
      emblaApi.off("select", updateScrollState)
    }
  }, [emblaApi, showEdgeFade, updateScrollState])

  const maskStyle = useMemo(() => {
    if (!showEdgeFade) return undefined

    let maskImage = null

    if (canScrollLeft && canScrollRight) {
      maskImage = "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
    } else if (canScrollLeft) {
      maskImage = "linear-gradient(to right, transparent, black 40px, black 100%)"
    } else if (canScrollRight) {
      maskImage = "linear-gradient(to left, transparent, black 40px, black 100%)"
    }

    if (!maskImage) return undefined

    return {
      maskImage,
      WebkitMaskImage: maskImage,
    }
  }, [showEdgeFade, canScrollLeft, canScrollRight])

  return (
    <div style={maskStyle} className="w-full" {...props}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className={`flex ${className}`}>
          {children}
        </div>
      </div>
    </div>
  )
})

export default DragScrollRow
