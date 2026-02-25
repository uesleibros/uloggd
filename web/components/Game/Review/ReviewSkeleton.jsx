export default function ReviewSkeleton({ count = 3, showCover = false }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }, (_, i) => (
				<div key={i} className="rounded-xl p-5 sm:p-6 bg-zinc-800/50 border border-zinc-700 animate-pulse">
					<div className="flex items-start gap-3.5">
						{showCover ? (
							<div className="w-16 h-20 rounded-lg bg-zinc-700 flex-shrink-0" />
						) : (
							<div className="w-12 h-12 rounded-full bg-zinc-700 flex-shrink-0" />
						)}
						<div className="flex-1 space-y-3">
							<div className="h-4 w-36 bg-zinc-700 rounded" />
							<div className="h-8 w-28 bg-zinc-700 rounded-lg" />
							<div className="space-y-2 mt-1">
								<div className="h-3.5 w-full bg-zinc-700 rounded" />
								<div className="h-3.5 w-3/4 bg-zinc-700 rounded" />
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}