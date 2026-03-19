import { useCallback, useEffect, useState, forwardRef } from "react"
import useEmblaCarousel from "embla-carousel-react"
import AutoplayPlugin from "embla-carousel-autoplay"

const DragScrollRow = forwardRef(function DragScrollRow({
  children,
  className = "",
  autoScroll = false,
  autoScrollSpeed = 0.04,
  loop = false,
  showEdgeFade = true,
  ...props
}, ref) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const plugins = []

  if (autoScroll) {
    plugins.push(
      AutoplayPlugin({
        delay: 0,
        playOnInit: true,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        speed: Math.round(autoScrollSpeed * 1000),
      })
    )
  }

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop,
      dragFree: true,
      containScroll: loop ? false : "trimSnaps",
      align: "start",
    },
    plugins
  )

  const updateScrollState = useCallback(() => {
    if (!emblaApi || !showEdgeFade) return
    setCanScrollLeft(emblaApi.canScrollPrev())
    setCanScrollRight(emblaApi.canScrollNext())
  }, [emblaApi, showEdgeFade])

  useEffect(() => {
    if (!emblaApi) return

    updateScrollState()
    emblaApi.on("scroll", updateScrollState)
    emblaApi.on("reInit", updateScrollState)
    emblaApi.on("resize", updateScrollState)

    return () => {
      emblaApi.off("scroll", updateScrollState)
      emblaApi.off("reInit", updateScrollState)
      emblaApi.off("resize", updateScrollState)
    }
  }, [emblaApi, updateScrollState])

  let maskStyle
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
