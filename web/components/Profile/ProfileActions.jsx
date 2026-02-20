import { Pencil, Check, UserPlus } from "lucide-react"

export default function ProfileActions({ isOwnProfile, isFollowing, followLoading, onFollow, onEditProfile, isLoggedIn }) {
	if (isOwnProfile) {
		return (
			<button
				onClick={onEditProfile}
				className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0"
			>
				<Pencil className="w-4 h-4" />
				<span className="hidden sm:inline">Editar perfil</span>
				<span className="sm:hidden">Editar</span>
			</button>
		)
	}

	if (!isLoggedIn) return null

	return (
		<button
			onClick={onFollow}
			disabled={followLoading}
			className={`px-3 py-1.5 sm:px-5 sm:py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
				isFollowing
					? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5"
					: "bg-white text-black hover:bg-zinc-200"
			}`}
		>
			{isFollowing ? (
				<>
					<Check className="w-4 h-4" />
					Seguindo
				</>
			) : (
				<>
					<UserPlus className="w-4 h-4" />
					Seguir
				</>
			)}
		</button>
	)
}