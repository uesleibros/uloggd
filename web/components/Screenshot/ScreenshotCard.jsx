import { useState } from "react"
import { Link } from "react-router-dom"
import { EyeOff } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import LikeButton from "@components/UI/LikeButton"

export function ScreenshotCardSkeleton({ className = "" }) {
  return (
    <div className={`aspect-square bg-zinc-800/50 animate-pulse ${className}`} />
  )
}

export default function ScreenshotCard({
  screenshot,
  showLikeButton = true,
  className = "",
  imageClassName = "",
}) {
  const { user } = useAuth()
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={`relative aspect-square overflow-hidden bg-zinc-900 group ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      <Link to={`/screenshot/${screenshot.id}`} className="absolute inset-0 z-10 block">
        <img
          src={screenshot.image_url}
          alt={screenshot.caption || ""}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${screenshot.is_spoiler ? "blur-xl scale-110" : "group-hover:scale-105"} ${imageClassName}`}
        />

        {screenshot.is_spoiler && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-white/70" />
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </Link>

      {showLikeButton && (
        <div className="absolute right-2 bottom-2 z-20">
          <LikeButton
            type="screenshot"
            targetId={screenshot.id}
            currentUserId={user?.user_id}
            size="sm"
            showLabel={false}
            showCount={false}
          />
        </div>
      )}
    </div>
  )
}
