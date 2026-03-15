import { useState, useEffect } from "react"
import { ThumbsUp } from "lucide-react"
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
    const newLiked = !isLiked
    const newCount = newLiked ? count + 1 : count - 1

    setIsLiked(newLiked)
    setCount(newCount)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setIsLiked(!newLiked)
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
        setIsLiked(!newLiked)
        setCount(count)
      }
    } catch {
      setIsLiked(!newLiked)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  const sizes = {
    sm: {
      button: "px-2 py-1 gap-1",
      icon: "w-3.5 h-3.5",
      text: "text-xs",
    },
    md: {
      button: "px-3 py-1.5 gap-1.5",
      icon: "w-4 h-4",
      text: "text-sm",
    },
    lg: {
      button: "px-4 py-2 gap-2",
      icon: "w-5 h-5",
      text: "text-base",
    },
  }

  const s = sizes[size]

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={!currentUserId || loading}
          className={`group flex items-center ${s.button} rounded-lg border transition-all duration-200 cursor-pointer disabled:cursor-default disabled:opacity-50 ${
            isLiked
              ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/20"
              : "bg-zinc-800/60 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
          }`}
        >
          <ThumbsUp
            className={`${s.icon} transition-transform duration-200 group-hover:scale-110 ${isLiked ? "fill-current" : ""}`}
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
            className={`${s.text} text-zinc-500 hover:text-zinc-300 tabular-nums cursor-pointer transition-colors hover:underline`}
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