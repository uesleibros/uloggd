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
						<svg viewBox="0 0 24 24" className="w-4 h-4 text-[#66c0f4] fill-current">
							<path d="M11.979 0C5.361 0 0 5.367 0 11.987c0 2.59.814 4.978 2.195 6.941l3.522-5.118a5.195 5.195 0 0 1-.225-1.517A5.203 5.203 0 0 1 10.697 7.1a5.203 5.203 0 0 1 5.205 5.193 5.203 5.203 0 0 1-5.205 5.192 5.122 5.122 0 0 1-2.072-.446l-4.965 7.182A11.936 11.936 0 0 0 11.979 24c6.618 0 11.986-5.367 11.986-11.987C24 5.367 18.597 0 11.979 0zm5.132 12.234a3.398 3.398 0 0 0-3.394-3.385 3.398 3.398 0 0 0-3.394 3.385 3.398 3.398 0 0 0 3.394 3.386 3.398 3.398 0 0 0 3.394-3.386zm-4.706 0a1.314 1.314 0 0 1 1.312-1.312 1.314 1.314 0 0 1 1.312 1.312 1.314 1.314 0 0 1-1.312 1.312 1.314 1.314 0 0 1-1.312-1.312zm-3.048 2.257c-.158.552-.39 1.07-.678 1.543l-3.238-1.259a2.41 2.41 0 0 1 1.096-2.502 2.398 2.398 0 0 1 2.721-.137l3.203 4.67c-.206.182-.424.348-.654.498L8.711 15.03l.646-.539z"/>
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
