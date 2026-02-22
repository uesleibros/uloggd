import { useState } from "react"
import { Star, X } from "lucide-react"

export function HalfStar({ size = "w-10 h-10", filledColor = "text-amber-400", emptyColor = "text-zinc-700" }) {
	return (
		<div className={`relative ${size}`}>
			<Star className={`absolute inset-0 w-full h-full ${emptyColor} fill-current`} />
			<div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
				<Star className={`${size} ${filledColor} fill-current`} style={{ minWidth: "100%", width: "auto", minHeight: "100%" }} />
			</div>
		</div>
	)
}

export function StarRatingInput({ value, onChange, allowHalf = true, size = "md" }) {
	const [hover, setHover] = useState(0)
	const active = hover || value || 0
	const sizeClass = size === "sm" ? "w-8 h-8 sm:w-7 sm:h-7" : "w-10 h-10"

	return (
		<div className="flex items-center gap-3">
			<div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
				{[1, 2, 3, 4, 5].map((star) => {
					const halfVal = star * 2 - 1
					const fullVal = star * 2

					if (!allowHalf) {
						return (
							<div key={star} className={`relative ${sizeClass}`}>
								<div
									className="absolute inset-0 z-10 cursor-pointer"
									onMouseEnter={() => setHover(fullVal)}
									onClick={() => onChange(fullVal === value ? 0 : fullVal)}
								/>
								<Star className="absolute inset-0 w-full h-full text-zinc-700 fill-current" />
								{active >= fullVal && <Star className="absolute inset-0 w-full h-full text-amber-400 fill-current" />}
							</div>
						)
					}

					return (
						<div key={star} className={`relative ${sizeClass}`}>
							<div
								className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
								onMouseEnter={() => setHover(halfVal)}
								onClick={() => onChange(halfVal === value ? 0 : halfVal)}
							/>
							<div
								className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
								onMouseEnter={() => setHover(fullVal)}
								onClick={() => onChange(fullVal === value ? 0 : fullVal)}
							/>
							<Star className="absolute inset-0 w-full h-full text-zinc-700 fill-current" />
							{active >= halfVal && active < fullVal && (
								<div className="absolute inset-0">
									<Star className="w-full h-full text-amber-400 fill-current" style={{ clipPath: "inset(0 50% 0 0)" }} />
								</div>
							)}
							{active >= fullVal && <Star className="absolute inset-0 w-full h-full text-amber-400 fill-current" />}
						</div>
					)
				})}
			</div>

			{value > 0 && (
				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-400 tabular-nums">
						{allowHalf ? (value / 2).toFixed(1) : (value / 2).toFixed(0)}
					</span>
					<button
						type="button"
						onClick={() => onChange(0)}
						className="cursor-pointer text-zinc-600 hover:text-zinc-400 transition-colors p-2 -m-0.5"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	)
}