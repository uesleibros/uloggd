import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { EyeOff, Heart } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"

function ScreenshotCardSkeleton() {
  return (
    <div className="w-44 flex-shrink-0 animate-pulse">
      <div className="aspect-square rounded-lg bg-zinc-800/50" />
    </div>
  )
}

function ScreenshotCard({ screenshot }) {
  return (
    <Link
      to={`/screenshot/${screenshot.id}`}
      className="group relative w-44 flex-shrink-0 block"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-900">
        <img
          src={screenshot.image_url}
          alt={screenshot.caption || ""}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
            screenshot.is_spoiler ? "blur-xl scale-110" : "group-hover:scale-105"
          }`}
        />

        {screenshot.is_spoiler && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-white/70" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {screenshot.user?.avatar ? (
                <img
                  src={screenshot.user.avatar}
                  alt={screenshot.user.username}
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-700 flex-shrink-0" />
              )}
              <span className="text-[11px] text-white/80 truncate">
                {screenshot.user?.username || "user"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-white/80 flex-shrink-0">
              <Heart className="w-3 h-3 fill-current" />
              <span>{screenshot.likes_count}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

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

      <DragScrollRow className="gap-3 pb-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <ScreenshotCardSkeleton key={i} />)
          : screenshots.map((screenshot) => (
              <ScreenshotCard key={screenshot.id} screenshot={screenshot} />
            ))}
      </DragScrollRow>
    </div>
  )
}
