import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Twitch, Radio, ExternalLink } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useProfileGames } from "#hooks/useProfileGames"
import PageBanner from "@components/Layout/PageBanner"
import SettingsModal from "@components/User/Settings/SettingsModal"
import { useProfileData } from "./hooks/useProfileData"
import { useFollowData } from "./hooks/useFollowData"
import { useUserLists } from "./hooks/useUserLists"
import { ProfileHeader } from "./sections/ProfileHeader"
import { ProfileNavigation } from "./sections/ProfileNavigation"
import { ProfileContent } from "./sections/ProfileContent"
import ProfileSkeleton from "./components/ProfileSkeleton"
import FollowListModal from "./components/FollowListModal"

function SteamIcon({ className }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 259" className={className} fill="currentColor">
			<path d="M127.779 0C57.895 0 .847 55.32.044 124.669l69.07 28.576a36.104 36.104 0 0 1 20.57-6.36c.67 0 1.333.027 1.993.067l30.776-44.573v-.626C122.453 75.088 144.2 53.34 170.864 53.34c26.663 0 48.412 21.748 48.412 48.412 0 26.664-21.749 48.412-48.412 48.412h-1.107l-43.874 31.292c0 .584.033 1.16.033 1.721 0 20.149-16.355 36.503-36.503 36.503-17.55 0-32.352-12.579-35.747-29.292L5.06 163.84C21.26 217.234 70.96 256.3 129.893 256.3c71.222 0 128.893-57.67 128.893-128.893C258.786 57.67 199 0 127.779 0zM80.17 196.07l-15.826-6.552a27.345 27.345 0 0 0 14.143 13.46 27.44 27.44 0 0 0 35.81-14.772 27.253 27.253 0 0 0 .046-20.943 27.108 27.108 0 0 0-14.82-14.865 27.29 27.29 0 0 0-20.152-.339l16.337 6.768c10.283 4.276 15.16 16.128 10.884 26.41-4.275 10.284-16.134 15.16-26.423 10.833zm112.593-94.318c0-13.326-10.85-24.176-24.176-24.176-13.327 0-24.177 10.85-24.177 24.176 0 13.327 10.85 24.177 24.177 24.177 13.326 0 24.176-10.85 24.176-24.177zm-42.3 0c0-10.038 8.093-18.131 18.124-18.131s18.131 8.093 18.131 18.131-8.1 18.131-18.131 18.131-18.124-8.093-18.124-18.131z" />
		</svg>
	)
}

function ActivityCards({ stream, userId }) {
	const [steamPresence, setSteamPresence] = useState(null)

	useEffect(() => {
		if (!userId) return

		const fetchPresence = async () => {
			try {
				const res = await fetch("/api/steam/presence", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId }),
				})
				const data = await res.json()
				if (data.playing) {
					setSteamPresence(data)
				}
			} catch {}
		}

		fetchPresence()
	}, [userId])

	if (!stream && !steamPresence) return null

	return (
		<div className="flex flex-wrap gap-3 mt-4">
			{stream && (
				<a
					href={`https://twitch.tv/${stream.twitch_username}`}
					target="_blank"
					rel="noopener noreferrer"
					className="group flex items-center gap-3 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all"
				>
					<img
						src={stream.thumbnail}
						alt={stream.title}
						className="w-14 h-8 object-cover rounded border border-zinc-700 flex-shrink-0"
					/>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<Twitch className="w-3 h-3 text-purple-400" />
							<span className="text-xs font-medium text-purple-400">
								{stream.twitch_username}
							</span>
							<span className="flex items-center gap-0.5 text-[9px] bg-red-600 text-white px-1 py-px rounded font-medium">
								<Radio className="w-2 h-2" />
								LIVE
							</span>
						</div>
						<div className="text-xs text-zinc-300 truncate max-w-[140px]">
							{stream.game}
						</div>
					</div>
					<span className="text-[10px] text-zinc-500 ml-1">
						{stream.viewers.toLocaleString()}
					</span>
				</a>
			)}

			{steamPresence && (
				<div className="group flex items-center gap-3 px-3 py-2 bg-[#171a21]/60 hover:bg-[#171a21] border border-[#2a475e]/50 rounded-lg transition-all">
					<img
						src={steamPresence.game?.cover || steamPresence.steam.header}
						alt={steamPresence.steam.name}
						className="w-8 h-10 object-cover rounded border border-[#2a475e] flex-shrink-0"
					/>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<SteamIcon className="w-3 h-3 text-[#66c0f4]" />
							<span className="text-[10px] uppercase font-semibold text-[#66c0f4]">
								Jogando
							</span>
						</div>
						<div className="text-xs text-zinc-300 truncate max-w-[120px]">
							{steamPresence.game?.name || steamPresence.steam.name}
						</div>
					</div>
					{steamPresence.game?.slug && (
						<Link
							to={`/game/${steamPresence.game.slug}`}
							className="text-[10px] bg-[#2a475e] hover:bg-[#66c0f4] hover:text-[#171a21] text-[#66c0f4] px-2 py-1 rounded font-medium transition-colors ml-1"
						>
							Ver
						</Link>
					)}
				</div>
			)}
		</div>
	)
}

export default function Profile() {
	const { username } = useParams()
	const { profile, isOwnProfile, currentUser, authLoading, fetching, error, updateProfile } =
		useProfileData(username)

	const { profileGames, counts, igdbGames, loadingGames } = useProfileGames(profile?.id)
	const { userLists, setUserLists, loadingLists } = useUserLists(profile?.id)
	const {
		isFollowing,
		followLoading,
		followsYou,
		followersCount,
		followingCount,
		handleFollow,
	} = useFollowData(profile, currentUser, authLoading, isOwnProfile)

	const [activeSection, setActiveSection] = useState("profile")
	const [followModal, setFollowModal] = useState(null)
	const [settingsOpen, setSettingsOpen] = useState(false)

	usePageMeta(
		profile
			? {
					title: `${profile.username} - uloggd`,
					description: `Perfil de ${profile.username} no uloggd`,
					image: profile.avatar || undefined,
				}
			: undefined
	)

	const showSkeleton = authLoading || (fetching && !profile)

	if (showSkeleton) return <ProfileSkeleton />

	if (error || !profile) {
		return (
			<div className="flex flex-col items-center justify-center py-32 gap-4">
				<h1 className="text-2xl font-bold text-white">Usuário não encontrado</h1>
				<p className="text-sm text-zinc-500">
					O usuário &quot;{username}&quot; não existe ou foi removido.
				</p>
				<Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
					Voltar ao início
				</Link>
			</div>
		)
	}

	function handleSectionChange(sectionId) {
		if (sectionId === activeSection) return
		setActiveSection(sectionId)
	}

	return (
		<div>
			<PageBanner image={profile.banner} height="profile" />
			<div className="pt-[22vw] sm:pt-[20vw] md:pt-36 pb-16">
				<ProfileHeader
					profile={profile}
					isOwnProfile={isOwnProfile}
					currentUser={currentUser}
					isFollowing={isFollowing}
					followLoading={followLoading}
					followsYou={followsYou}
					followersCount={followersCount}
					followingCount={followingCount}
					counts={counts}
					onFollow={handleFollow}
					onEditProfile={() => setSettingsOpen(true)}
					onProfileUpdate={updateProfile}
					onFollowersClick={() => setFollowModal("Seguidores")}
					onFollowingClick={() => setFollowModal("Seguindo")}
				/>

				<ActivityCards stream={profile?.stream} userId={profile.id} />

				<ProfileNavigation
					activeSection={activeSection}
					onSectionChange={handleSectionChange}
					counts={counts}
					listsCount={userLists.length}
					reviewsCount={profile?.counts?.reviews || 0}
					likesCount={(counts?.liked || 0) + (profile?.counts?.likedReviews || 0)}
				/>

				<ProfileContent
					activeSection={activeSection}
					profile={profile}
					profileGames={profileGames}
					igdbGames={igdbGames}
					loadingGames={loadingGames}
					counts={counts}
					isOwnProfile={isOwnProfile}
					userLists={userLists}
					setUserLists={setUserLists}
					loadingLists={loadingLists}
					onEditProfile={() => setSettingsOpen(true)}
				/>
			</div>

			<FollowListModal
				isOpen={!!followModal}
				title={followModal || ""}
				userId={profile.id}
				onClose={() => setFollowModal(null)}
			/>
			<SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
		</div>
	)
}
