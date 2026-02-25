import { useState, useEffect, useRef, useCallback } from "react"

export default function CountUp({
  end,
  start = 0,
  duration = 1000,
  decimals = 0,
  useEasing = true,
  useGrouping = true,
  prefix = "",
  suffix = "",
  startOnVisible = true,
  className = "",
}) {
  const [currentValue, setCurrentValue] = useState(start)
  const elementRef = useRef(null)
  const frameRef = useRef(null)
  const observerRef = useRef(null)

  const formatNumber = useCallback(
    (num) => {
      const fixed = Number(num).toFixed(decimals)

      const formatted = useGrouping
        ? new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(Number(fixed))
        : fixed

      return `${prefix}${formatted}${suffix}`
    },
    [decimals, useGrouping, prefix, suffix]
  )

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

  const animate = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    const startValue = start
    const endValue = end
    const startTime = performance.now()

    const update = (timestamp) => {
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = useEasing ? easeOutCubic(progress) : progress

      const newValue =
        startValue + (endValue - startValue) * easedProgress

      setCurrentValue(newValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(update)
      }
    }

    frameRef.current = requestAnimationFrame(update)
  }, [start, end, duration, useEasing])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (!startOnVisible) {
      animate()
      return
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate()
            observerRef.current?.disconnect()
          }
        })
      },
      { threshold: 0.2 }
    )

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [animate, startOnVisible])

  return (
    <span ref={elementRef} className={className}>
      {formatNumber(currentValue)}
    </span>
  )
}