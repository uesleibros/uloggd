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
      <div className={isLong ? "max-h-36 overflow-hidden" : ""}>
        <MarkdownPreview ownerId={review?.user_id} content={review.review} />
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="mt-2 inline-block text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          {t("readFullReview")}
        </Link>
      )}
    </div>
  )
}
