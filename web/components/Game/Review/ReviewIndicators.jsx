import { Heart, Trophy } from "lucide-react"

export default function ReviewIndicators({ review }) {
	return (
		<>
			{review.liked && <Heart className="w-5 h-5 text-red-500 fill-current flex-shrink-0" />}
			{review.mastered && <Trophy className="w-5 h-5 text-amber-400 fill-current flex-shrink-0" />}
		</>
	)
}