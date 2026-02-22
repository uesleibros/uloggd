import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { ReviewModal } from "./ReviewModal"
import { UserReviewCard } from "./ReviewCard"

function ReviewSelector({ reviews, selectedId, onSelect, onNew }) {
  if (reviews.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {reviews.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
            selectedId === r.id
              ? "bg-white text-black"
              : "bg-zinc-800/50 text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-600"
          }`}
        >
          {r.title || "Review"}
        </button>
      ))}
      <button
        type="button"
        onClick={onNew}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-white border border-dashed border-zinc-700 hover:border-zinc-500 cursor-pointer transition-all duration-200"
      >
        <Plus className="w-3 h-3" />
        Nova
      </button>
    </div>
  )
}

export default function ReviewButton({ game }) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)

  const fetchReviews = useCallback(async () => {
    if (!user || !game?.id) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch("/api/reviews/@me/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ gameId: game.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setReviews(data)
        if (data.length > 0 && !selectedReview) {
          setSelectedReview(data[0])
        }
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [user, game?.id])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  if (!user) return null

  const hasReviews = reviews.length > 0
  const activeReview = selectedReview || reviews[0] || null

  function openModal(review = activeReview) {
    setSelectedReview(review)
    setShowModal(true)
  }

  function openNewReview() {
    setSelectedReview(null)
    setShowModal(true)
  }

  function handleClose() {
    setShowModal(false)
    fetchReviews()
  }

  function handleDeleted() {
    setSelectedReview(null)
    fetchReviews()
  }

  return (
    <>
      {hasReviews ? (
        <div className="space-y-3">
          {reviews.length > 1 && (
            <ReviewSelector
              reviews={reviews}
              selectedId={activeReview?.id}
              onSelect={(r) => setSelectedReview(r)}
              onNew={openNewReview}
            />
          )}
          <UserReviewCard review={activeReview} onEdit={() => openModal(activeReview)} />
          {reviews.length === 1 && (
            <button
              type="button"
              onClick={openNewReview}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Criar outra review
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => openModal(null)}
          disabled={loading}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          Criar Review
        </button>
      )}

      <Modal isOpen={showModal} onClose={handleClose} raw fullscreenMobile className="w-full md:max-w-2xl">
        {showModal && (
          <ReviewModal
            game={game}
            existingReview={selectedReview}
            onClose={handleClose}
            onDeleted={handleDeleted}
          />
        )}
      </Modal>
    </>
  )
}

export { UserReviewCard } from "./ReviewCard"