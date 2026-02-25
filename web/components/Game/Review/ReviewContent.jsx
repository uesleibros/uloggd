import { useState } from "react"
import { FileText } from "lucide-react"
import { MarkdownPreview } from "@components/MarkdownEditor"
import SpoilerOverlay from "./SpoilerOverlay"

export default function ReviewContent({ review, onOpenModal }) {
	const [spoilerRevealed, setSpoilerRevealed] = useState(false)

	if (!review.review) return null

	const isLong = review.review.length > 300
	const isSpoilerHidden = review.contain_spoilers && !spoilerRevealed

	if (isSpoilerHidden) {
		return <SpoilerOverlay onReveal={() => setSpoilerRevealed(true)} />
	}

	if (isLong) {
		return (
			<div className="relative">
				<div className="max-h-36 overflow-hidden">
					<MarkdownPreview content={review.review} />
				</div>
				<div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-800/90 to-transparent pointer-events-none rounded-b-lg" />
				<button
					onClick={onOpenModal}
					className="relative z-10 mt-2 px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer transition-all duration-200 flex items-center gap-2 font-medium bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg border border-zinc-700/50"
				>
					<FileText className="w-4 h-4" />
					Ler review completa
				</button>
			</div>
		)
	}

	return <MarkdownPreview content={review.review} />
}