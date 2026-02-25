import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ThumbsUp } from "lucide-react"
import { MarkdownPreview } from "@components/MarkdownEditor"
import UserBadges from "@components/User/UserBadges"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import StatusBadge from "@components/Game/StatusBadge"
import ReviewRating from "@components/Game/ReviewRating"
import Playtime from "@components/Game/Playtime"
import Modal from "@components/UI/Modal"
import LikeListModal from "@components/Game/LikeListModal"
import CountUp from "@components/UI/CountUp"
import Pagination from "@components/UI/Pagination"
import {
	AspectRatingsPreview,
	ReviewIndicators,
	ReviewModalContent,
	ReviewContent,
	ReviewEmptyState,
	ReviewSkeleton,
} from "@components/Game/Review"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"
import { getTimeAgo } from "#utils/formatDate"
import { SORT_OPTIONS } from "#constants/game"

function LikeButton({ reviewId, currentUserId }) {
	const [isLiked, setIsLiked] = useState(false)
	const [count, setCount] = useState(0)
	const [loading, setLoading] = useState(false)
	const [showLikes, setShowLikes] = useState(false)

	useEffect(() => {
		fetch("/api/reviews/likeStatus", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ reviewId, currentUserId }),
		})
			.then(r => r.json())
			.then(data => {
				setCount(data.count || 0)
				setIsLiked(data.isLiked || false)
			})
			.catch(() => {})
	}, [reviewId, currentUserId])

	const handleLike = async () => {
		if (!currentUserId || loading) return
		setLoading(true)

		const action = isLiked ? "unlike" : "like"
		const newLiked = !isLiked
		const newCount = newLiked ? count + 1 : count - 1

		setIsLiked(newLiked)
		setCount(newCount)

		try {
			const { data: { session } } = await supabase.auth.getSession()
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

	const label = count === 1 ? "curtida" : "curtidas"

	return (
		<>
			<div className="flex items-center gap-2">
				<button
					onClick={handleLike}
					disabled={!currentUserId || loading}
					className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-default ${
						isLiked
							? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/15"
							: "bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 hover:border-zinc-600/50"
					}`}
				>
					<ThumbsUp className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isLiked ? "fill-current" : ""}`} />
					<span className="text-sm font-medium">
						{isLiked ? "Curtido" : "Curtir"}
					</span>
				</button>
				{count > 0 && (
					<button
						onClick={() => setShowLikes(true)}
						className="text-sm text-zinc-500 hover:text-zinc-300 tabular-nums cursor-pointer transition-colors hover:underline"
					>
						<CountUp end={count} /> {label}
					</button>
				)}
			</div>

			<LikeListModal
				isOpen={showLikes}
				reviewId={reviewId}
				onClose={() => setShowLikes(false)}
			/>
		</>
	)
}

function ReviewModalHeader({ review, user, currentUserId, onClose }) {
	return (
		<div className="flex items-center justify-between p-5 border-b border-zinc-700 flex-shrink-0">
			<div className="flex items-center gap-3.5 min-w-0">
				<Link to={`/u/${user?.username}`} onClick={onClose} className="flex-shrink-0">
					<AvatarWithDecoration
						src={user.avatar}
						alt={user.username}
						decoration={user.avatar_decoration}
						size="lg"
					/>
				</Link>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<Link to={`/u/${user?.username}`} onClick={onClose} className="text-base font-semibold text-white hover:text-zinc-300 transition-colors">
							{user?.username || "Usuário"}
						</Link>
						<UserBadges user={user} size="md" clickable />
						<StatusBadge status={review.status} />
						<ReviewIndicators review={review} />
					</div>
					<div className="flex items-center gap-3 mt-1.5">
						<ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
						<span className="text-sm text-zinc-600">{getTimeAgo(review.created_at)}</span>
					</div>
				</div>
			</div>
			<LikeButton reviewId={review.id} currentUserId={currentUserId} />
		</div>
	)
}

export function ReviewCard({ review, user, currentUserId }) {
	const [showModal, setShowModal] = useState(false)
	const aspects = review.aspect_ratings || []

	return (
		<>
			<div className="rounded-xl p-5 sm:p-6 bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-all duration-200">
				<div className="flex items-start gap-3.5">
					<Link to={`/u/${user?.username}`} className="flex-shrink-0">
						<AvatarWithDecoration
							src={user.avatar}
							alt={user.username}
							decoration={user.avatar_decoration}
							size="lg"
						/>
					</Link>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<Link to={`/u/${user?.username}`} className="text-base font-semibold text-white hover:text-zinc-300 transition-colors truncate">
								{user?.username || "Usuário"}
							</Link>
							<UserBadges user={user} size="md" clickable />
							<StatusBadge status={review.status} />
							<ReviewIndicators review={review} />
						</div>

						<div className="flex items-center gap-3 mt-1.5">
							<ReviewRating rating={review.rating} ratingMode={review.rating_mode} />
							<span className="text-sm text-zinc-600">{getTimeAgo(review.created_at)}</span>
						</div>

						{aspects.length > 0 && (
							<div className="mt-3 p-3 bg-zinc-900/40 border border-zinc-700/30 rounded-lg">
								<AspectRatingsPreview aspects={aspects} compact />
							</div>
						)}

						{review.review && (
							<div className="mt-4">
								<ReviewContent review={review} onOpenModal={() => setShowModal(true)} />
							</div>
						)}

						<div className="flex items-center justify-between mt-4">
							<Playtime hours={review.hours_played} minutes={review.minutes_played} />
							<LikeButton reviewId={review.id} currentUserId={currentUserId} />
						</div>
					</div>
				</div>
			</div>

			<Modal
				isOpen={showModal}
				onClose={() => setShowModal(false)}
				fullscreenMobile
				showCloseButton={false}
				maxWidth="max-w-2xl"
				className="!bg-zinc-900 !border-zinc-700 !rounded-t-2xl md:!rounded-xl !shadow-2xl"
			>
				<ReviewModalHeader review={review} user={user} currentUserId={currentUserId} onClose={() => setShowModal(false)} />
				<div className="flex-1 overflow-y-auto overscroll-contain">
					<ReviewModalContent review={review} />
				</div>
			</Modal>
		</>
	)
}

export default function GameReviews({ gameId }) {
	const { user: currentUser } = useAuth()
	const [reviews, setReviews] = useState([])
	const [users, setUsers] = useState({})
	const [loading, setLoading] = useState(true)
	const [sortBy, setSortBy] = useState("recent")
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)

	useEffect(() => {
		if (!gameId) return
		setLoading(true)

		fetch("/api/reviews/public", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameId, sortBy, page, limit: 20 }),
		})
			.then((r) => r.ok ? r.json() : { reviews: [], users: {} })
			.then((data) => {
				setReviews(data.reviews || [])
				setUsers(data.users || {})
				setTotalPages(data.totalPages || 1)
				setTotal(data.total || 0)
			})
			.catch(() => {})
			.finally(() => setLoading(false))
	}, [gameId, sortBy, page])

	function handleSortChange(newSort) {
		setSortBy(newSort)
		setPage(1)
	}

	function handlePageChange(newPage) {
		setPage(newPage)
		window.scrollTo({ top: 0, behavior: "smooth" })
	}

	const title = "Reviews da comunidade"

	if (loading) {
		return (
			<div>
				<h2 className="text-lg font-semibold text-white mb-5">{title}</h2>
				<ReviewSkeleton />
			</div>
		)
	}

	if (!reviews.length) {
		return (
			<div>
				<h2 className="text-lg font-semibold text-white mb-5">{title}</h2>
				<ReviewEmptyState />
			</div>
		)
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-5">
				<h2 className="text-lg font-semibold text-white">
					{title}
					<span className="text-sm text-zinc-500 font-normal ml-2">{total}</span>
				</h2>
				<div className="flex gap-1">
					{SORT_OPTIONS.map((option) => (
						<button
							key={option.key}
							onClick={() => handleSortChange(option.key)}
							className={`px-3.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ${
								sortBy === option.key
									? "bg-white text-black"
									: "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			<div className="space-y-3">
				{reviews.map((review) => (
					<ReviewCard key={review.id} review={review} user={users[review.user_id]} currentUserId={currentUser?.id} />
				))}
			</div>

			<Pagination
				currentPage={page}
				totalPages={totalPages}
				onPageChange={handlePageChange}
			/>
		</div>
	)
}