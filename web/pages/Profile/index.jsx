import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Twitch, Radio } from "lucide-react"
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

function StreamCard({ stream }) {
	return (
		<a
			href={`https://twitch.tv/${stream.twitch_username}`}
			target="_blank"
			rel="noopener noreferrer"
			className="bg-zinc-800/50 border border-purple-500/30 hover:border-purple-500/50 rounded-lg px-4 py-3 transition-colors block mt-6"
		>
			<div className="flex items-center gap-4">
				<img
					src={stream.thumbnail}
					alt={stream.title}
					className="w-20 h-12 object-cover rounded-md border border-zinc-700 flex-shrink-0"
				/>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 mb-1">
						<Twitch className="w-4 h-4 text-purple-400" />
						<span className="text-xs font-medium text-purple-400">
							{stream.twitch_username}
						</span>
						<span className="flex items-center gap-1 text-[10px] bg-red-600/90 text-white px-1.5 py-0.5 rounded">
							<Radio className="w-3 h-3" />
							AO VIVO
						</span>
					</div>

					<div className="text-sm font-semibold text-white truncate">
						{stream.title}
					</div>

					<div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
						<span className="truncate">{stream.game}</span>
						<span>•</span>
						<span>{stream.viewers.toLocaleString()} assistindo</span>
					</div>
				</div>
			</div>
		</a>
	)
}

function SteamPresenceCard({ userId }) {
	const [presence, setPresence] = useState(null)
	const [loading, setLoading] = useState(true)

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
					setPresence(data)
				} else {
					setPresence(null)
				}
			} catch {
				setPresence(null)
			} finally {
				setLoading(false)
			}
		}

		fetchPresence()
	}, [userId])

	if (loading || !presence) return null

	return (
		<div className="mt-4 bg-[#171a21]/80 border border-[#2a475e]/50 rounded-lg p-3 flex items-center gap-4 relative overflow-hidden group hover:bg-[#171a21] transition-colors">
			<div 
				className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center pointer-events-none"
				style={{ backgroundImage: `url(${presence.steam.header})` }}
			/>
			
			<div className="relative z-10 flex items-center gap-3 w-full">
				<div className="relative flex-shrink-0">
					<img 
						src={presence.game?.cover || presence.steam.header} 
						alt={presence.steam.name}
						className="w-12 h-16 object-cover rounded shadow-lg bg-[#0f1116]"
					/>
					<div className="absolute -bottom-1 -right-1 bg-[#171a21] rounded-full p-0.5 shadow-sm">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 259" className="w-4 h-4 text-[#66c0f4] fill-current">
							<path d="M127.779 0C57.895 0 .847 55.32.044 124.669l69.07 28.576a36.104 36.104 0 0 1 20.57-6.36c.67 0 1.333.027 1.993.067l30.776-44.573v-.626C122.453 75.088 144.2 53.34 170.864 53.34c26.663 0 48.412 21.748 48.412 48.412 0 26.664-21.749 48.412-48.412 48.412h-1.107l-43.874 31.292c0 .584.033 1.16.033 1.721 0 20.149-16.355 36.503-36.503 36.503-17.55 0-32.352-12.579-35.747-29.292L5.06 163.84C21.26 217.234 70.96 256.3 129.893 256.3c71.222 0 128.893-57.67 128.893-128.893C258.786 57.67 199 0 127.779 0zM80.17 196.07l-15.826-6.552a27.345 27.345 0 0 0 14.143 13.46 27.44 27.44 0 0 0 35.81-14.772 27.253 27.253 0 0 0 .046-20.943 27.108 27.108 0 0 0-14.82-14.865 27.29 27.29 0 0 0-20.152-.339l16.337 6.768c10.283 4.276 15.16 16.128 10.884 26.41-4.275 10.284-16.134 15.16-26.423 10.833zm112.593-94.318c0-13.326-10.85-24.176-24.176-24.176-13.327 0-24.177 10.85-24.177 24.176 0 13.327 10.85 24.177 24.177 24.177 13.326 0 24.176-10.85 24.176-24.177zm-42.3 0c0-10.038 8.093-18.131 18.124-18.131s18.131 8.093 18.131 18.131-8.1 18.131-18.131 18.131-18.124-8.093-18.124-18.131z" />
						</svg>
					</div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="text-[10px] uppercase font-bold text-[#66c0f4] tracking-wide mb-0.5">
						Jogando agora
					</div>
					<div className="text-sm font-bold text-white truncate leading-tight">
						{presence.game?.name || presence.steam.name}
					</div>
					<div className="text-xs text-zinc-400 mt-0.5 truncate">
						{presence.profile.name} • Steam
					</div>
				</div>

				{presence.game?.slug && (
					<Link
						to={`/game/${presence.game.slug}`}
						className="px-3 py-1.5 bg-[#2a475e] hover:bg-[#66c0f4] hover:text-[#171a21] text-[#66c0f4] text-xs font-bold rounded transition-colors z-10 whitespace-nowrap"
					>
						Ver Jogo
					</Link>
				)}
			</div>
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

				{profile?.stream && <StreamCard stream={profile.stream} />}
				
				<SteamPresenceCard userId={profile.id} />

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


