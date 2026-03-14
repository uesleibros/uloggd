import { useState, useEffect } from "react"
import { ThumbsUp } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import LikeListModal from "@components/Game/LikeListModal"
import CountUp from "@components/UI/CountUp"

export function LikeButton({ reviewId, currentUserId }) {
  const { t } = useTranslation("reviews")
  const [isLiked, setIsLiked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showLikes, setShowLikes] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams({ reviewId })
    if (currentUserId) params.append("currentUserId", currentUserId)

    fetch(`/api/reviews/likeStatus?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCount(data.count || 0)
        setIsLiked(data.isLiked || false)
      })
      .catch(() => {})
  }, [reviewId, currentUserId])

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

      const r = await fetch("/api/reviews/@me/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reviewId, action }),
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

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={!currentUserId || loading}
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer disabled:cursor-default disabled:opacity-50 ${
            isLiked
              ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/20"
              : "bg-zinc-800/60 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
          }`}
        >
          <ThumbsUp
            className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isLiked ? "fill-current" : ""}`}
          />
          <span className="text-sm font-medium">{isLiked ? t("liked") : t("like")}</span>
        </button>

        {count > 0 && (
          <button
            onClick={() => setShowLikes(true)}
            className="text-sm text-zinc-500 hover:text-zinc-300 tabular-nums cursor-pointer transition-colors hover:underline"
          >
            <CountUp end={count} /> {t("likesCount", { count })}
          </button>
        )}
      </div>

      <LikeListModal isOpen={showLikes} reviewId={reviewId} onClose={() => setShowLikes(false)} />
    </>
  )
}
