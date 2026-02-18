export default function ProfileActions({ isOwnProfile, isFollowing, followLoading, onFollow, onEditProfile, isLoggedIn }) {
	if (isOwnProfile) {
		return (
			<button
				onClick={onEditProfile}
				className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
				</svg>
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
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
					Seguindo
				</>
			) : (
				<>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
					</svg>
					Seguir
				</>
			)}
		</button>
	)
}
