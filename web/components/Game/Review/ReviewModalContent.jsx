import { MarkdownPreview } from "@components/MarkdownEditor"
import Playtime from "@components/Game/Playtime"
import AspectRatingDisplay from "./AspectRatingDisplay"
import SpoilerBanner from "./SpoilerBanner"

export default function ReviewModalContent({ review }) {
	const aspects = review.aspect_ratings || []

	return (
		<div className="p-5 md:p-7">
			{review.contain_spoilers && <SpoilerBanner />}

			{aspects.length > 0 && (
				<div className="mb-5 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
					<h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Avaliação por aspecto</h4>
					<div className="space-y-2.5">
						{aspects.map((aspect, i) => (
							<div key={i}>
								<div className="flex items-center justify-between gap-3">
									<span className="text-sm text-zinc-300">{aspect.label}</span>
									<AspectRatingDisplay aspect={aspect} />
								</div>
								{aspect.review && (
									<div className="mt-1.5 pl-0 text-xs text-zinc-500 leading-relaxed">
										<MarkdownPreview content={aspect.review} />
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			<MarkdownPreview content={review.review || ""} />

			<Playtime hours={review.hours_played} minutes={review.minutes_played} className="mt-6 pt-5 border-t border-zinc-700/50" />
		</div>
	)
}