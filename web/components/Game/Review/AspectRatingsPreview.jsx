import AspectRatingDisplay from "./AspectRatingDisplay"

export default function AspectRatingsPreview({ aspects, compact = false }) {
	if (!aspects?.length) return null

	return (
		<div className={`space-y-1.5 ${compact ? "" : "pt-1"}`}>
			{aspects.map((aspect, i) => (
				<div key={i} className="flex items-center justify-between gap-3">
					<span className="text-xs text-zinc-500 truncate">{aspect.label}</span>
					<AspectRatingDisplay aspect={aspect} />
				</div>
			))}
		</div>
	)
}