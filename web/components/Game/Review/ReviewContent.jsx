import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import { MarkdownPreview } from "@components/MarkdownEditor"
import SpoilerOverlay from "./SpoilerOverlay"

export default function ReviewContent({ review, linkTo }) {
  const { t } = useTranslation("reviews")
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)

  if (!review.review) return null

  const isLong = review.review.length > 300
  const isSpoilerHidden = review.contain_spoilers && !spoilerRevealed

  if (isSpoilerHidden) {
    return <SpoilerOverlay onReveal={() => setSpoilerRevealed(true)} />
  }

  return (
    <div>
      <div className={isLong ? "relative" : ""}>
        <div className={isLong ? "max-h-36 overflow-hidden" : ""}>
          <MarkdownPreview ownerId={review?.user_id} content={review.review} />
        </div>
        {isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-800/90 to-transparent pointer-events-none" />
        )}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          {t("readFullReview")}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  )
}
