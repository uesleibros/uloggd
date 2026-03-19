import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import LikeListModal from "@components/UI/LikeListModal"
import CountUp from "@components/UI/CountUp"

export default function LikeButton({
  type,
  targetId,
  currentUserId,
  size = "md",
  showLabel = true,
  showCount = true,
}) {
  const { t } = useTranslation("common")
  const [isLiked, setIsLiked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showLikes, setShowLikes] = useState(false)

  useEffect(() => {
    if (!targetId) return

    const params = new URLSearchParams({
      type,
      targetId: String(targetId),
    })
    if (currentUserId) params.append("currentUserId", currentUserId)

    fetch(`/api/likes/status?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCount(data.count || 0)
        setIsLiked(data.isLiked || false)
      })
      .catch(() => {})
  }, [type, targetId, currentUserId])

  async function handleLike() {
    if (!currentUserId || loading) return
    setLoading(true)

    const action = isLiked ? "unlike" : "like"
    const nextLiked = !isLiked
    const nextCount = nextLiked ? count + 1 : count - 1

    setIsLiked(nextLiked)
    setCount(nextCount)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setIsLiked(!nextLiked)
        setCount(count)
        return
      }

      const r = await fetch("/api/likes/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, targetId, action }),
      })

      if (!r.ok) {
        setIsLiked(!nextLiked)
        setCount(count)
      }
    } catch {
      setIsLiked(!nextLiked)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  const sizes = {
    sm: {
      button: "h-7 px-2 gap-1.5 rounded-md",
      icon: "w-3.5 h-3.5",
      text: "text-xs",
      count: "text-xs",
    },
    md: {
      button: "h-9 px-3 gap-2 rounded-lg",
      icon: "w-4 h-4",
      text: "text-sm",
      count: "text-sm",
    },
    lg: {
      button: "h-10 px-4 gap-2 rounded-lg",
      icon: "w-4.5 h-4.5",
      text: "text-sm",
      count: "text-sm",
    },
  }

  const s = sizes[size]

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={!currentUserId || loading}
          className={`group inline-flex items-center justify-center ${s.button} border transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50 ${
            isLiked
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/15"
              : "bg-zinc-800/60 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
          }`}
        >
          <Heart
            className={`${s.icon} transition-transform duration-200 group-hover:scale-110 ${
              isLiked ? "fill-current" : ""
            }`}
          />
          {showLabel && (
            <span className={`${s.text} font-medium`}>
              {isLiked ? t("likeButton.liked") : t("likeButton.like")}
            </span>
          )}
        </button>

        {showCount && count > 0 && (
          <button
            onClick={() => setShowLikes(true)}
            className={`${s.count} text-zinc-500 hover:text-zinc-300 tabular-nums cursor-pointer transition-colors`}
          >
            <CountUp end={count} /> {t("likeButton.count", { count })}
          </button>
        )}
      </div>

      <LikeListModal
        isOpen={showLikes}
        type={type}
        targetId={targetId}
        onClose={() => setShowLikes(false)}
      />
    </>
  )
}
