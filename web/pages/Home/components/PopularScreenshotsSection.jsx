import { useEffect, useRef, useState } from "react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"
import ScreenshotCard, { ScreenshotCardSkeleton } from "@components/Screenshot/ScreenshotCard"

export default function PopularScreenshotsSection() {
  const { t } = useTranslation("home")
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return

    let cancelled = false

    fetch("/api/home/popularScreenshots?limit=12")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setScreenshots(data.screenshots || [])
          setLoading(false)
          fetchedRef.current = true
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!loading && screenshots.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
        {t("sections.popularScreenshots")}
      </h2>

      <DragScrollRow className="gap-3 pb-2" autoScroll loop>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-44 flex-shrink-0">
                <ScreenshotCardSkeleton />
              </div>
            ))
          : screenshots.map((screenshot) => (
              <div key={screenshot.id} className="w-44 flex-shrink-0">
                <ScreenshotCard screenshot={screenshot} />
              </div>
            ))}
      </DragScrollRow>
    </div>
  )
}
