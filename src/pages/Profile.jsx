import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "../../hooks/usePageMeta"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import { useProfileGames, filterGamesByTab } from "../../hooks/useProfileGames"
import UserBadges from "../components/User/UserBadges"
import PageBanner from "../components/Layout/PageBanner"
import ThinkingBubble from "../components/User/ThinkingBubble"
import SettingsModal from "../components/User/Settings/SettingsModal"
import ProfileSkeleton from "../components/Profile/ProfileSkeleton"
import ProfileActions from "../components/Profile/ProfileActions"
import ProfileStats from "../components/Profile/ProfileStats"
import ProfileTabs from "../components/Profile/ProfileTabs"
import BioSection from "../components/Profile/BioSection"
import ListsSection from "../components/Profile/ListsSection"
import FollowListModal from "../components/Profile/FollowListModal"
import AvatarWithDecoration from "../components/User/AvatarWithDecoration"

const GAMES_PER_PAGE = 24

export default function Profile() {
	const { username } = useParams()
	const { user: currentUser, loading: authLoading } = useAuth()
	const [profile, setProfile] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [activeTab, setActiveTab] = useState("playing")
	const [currentPage, setCurrentPage] = useState(1)
	const [isFollowing, setIsFollowing] = useState(false)
	const [followLoading, setFollowLoading] = useState(false)
	const [followsYou, setFollowsYou] = useState(false)
	const [followersCount, setFollowersCount] = useState(0)
	const [followingCount, setFollowingCount] = useState(0)
	const [followModal, setFollowModal] = useState(null)
	const [settingsOpen, setSettingsOpen] = useState(false)

	const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase()
	const { profileGames, counts, igdbGames, loadingGames } = useProfileGames(profile?.id)

	usePageMeta(profile ? {
		title: `${profile.username} - uloggd`,
		description: `Perfil de ${profile.username} no uloggd`,
		image: profile.avatar || undefined,
	} : undefined)

	useEffect(() => { setCurrentPage(1) }, [activeTab])

	useEffect(() => {
		setLoading(true)
		setError(null)
		setProfile(null)
		setIsFollowing(false)
		setFollowersCount(0)
		setFollowingCount(0)

		const controller = new AbortController()
		fetch("/api/user?action=profile", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username }),
			signal: controller.signal,
		})
			.then(res => { if (!res.ok) throw new Error(); return res.json() })
			.then(data => { setProfile(data); setLoading(false) })
			.catch(err => { if (err.name !== "AbortError") { setError(true); setLoading(false) } })

		return () => controller.abort()
	}, [username])

	useEffect(() => {
		if (!profile || authLoading) return
		const controller = new AbortController()

		fetch("/api/user?action=followStatus", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId: profile.id, currentUserId: currentUser?.id || null }),
			signal: controller.signal,
		})
			.then(r => r.json())
			.then(s => { setFollowersCount(s.followers); setFollowingCount(s.following); setIsFollowing(s.isFollowing); setFollowsYou(s.followsYou) })
			.catch(() => {})

		return () => controller.abort()
	}, [profile, currentUser?.id, authLoading])

	async function handleFollow() {
		if (!currentUser || !profile) return
		setFollowLoading(true)
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return
			const res = await fetch("/api/user?action=follow", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ followingId: profile.id, action: isFollowing ? "unfollow" : "follow" }),
			})
			const data = await res.json()
			setIsFollowing(data.followed)
			setFollowersCount(prev => data.followed ? prev + 1 : prev - 1)
		} catch {} finally { setFollowLoading(false) }
	}

	if (loading) return <ProfileSkeleton />

	if (error || !profile) {
		return (
			<div className="flex flex-col items-center justify-center py-32 gap-4">
				<h1 className="text-2xl font-bold text-white">Usuário não encontrado</h1>
				<p className="text-sm text-zinc-500">O usuário &quot;{username}&quot; não existe ou foi removido.</p>
				<Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Voltar ao início</Link>
			</div>
		)
	}

	const allTabGames = filterGamesByTab(profileGames, igdbGames, activeTab)
	const totalPages = Math.ceil(allTabGames.length / GAMES_PER_PAGE)
	const tabGames = allTabGames.slice((currentPage - 1) * GAMES_PER_PAGE, currentPage * GAMES_PER_PAGE)

	const memberSince = profile.created_at
		? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
		: null

	return (
		<div>
			<PageBanner image={profile.banner} height="profile" />
			<div className="pt-[22vw] sm:pt-[20vw] md:pt-36 pb-16">
				<div className="flex flex-col md:flex-row gap-6 md:gap-8">
					<div className="flex-shrink-0">
						<div className="relative">
							<AvatarWithDecoration
								src={profile.avatar}
								alt={profile.username}
								decoration={profile.avatar_decoration}
								size="profile"
							/>
							<div className="absolute z-20 left-[15%] sm:left-[13%] md:left-[65%]" style={{ bottom: 'calc(100% - 10px)' }}>
								<ThinkingBubble
									text={profile.thinking}
									isOwnProfile={isOwnProfile}
									onSave={t => setProfile(prev => ({ ...prev, thinking: t }))}
								/>
							</div>
						</div>
					</div>

					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
								<h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{profile.username}</h1>
								<UserBadges user={profile} clickable size="xl" />
							</div>
							<ProfileActions
								isOwnProfile={isOwnProfile}
								isFollowing={isFollowing}
								followLoading={followLoading}
								onFollow={handleFollow}
								onEditProfile={() => setSettingsOpen(true)}
								isLoggedIn={!!currentUser}
							/>
						</div>
						<ProfileStats
							counts={counts}
							followersCount={followersCount}
							followingCount={followingCount}
							memberSince={memberSince}
							onFollowersClick={() => setFollowModal("Seguidores")}
							onFollowingClick={() => setFollowModal("Seguindo")}
							followsYou={followsYou && !isOwnProfile}
						/>
					</div>
				</div>

				<BioSection 
					bio={profile.bio} 
					isOwnProfile={isOwnProfile} 
					onEdit={() => setSettingsOpen(true)} 
					profileGames={profileGames}
				/>

				<ProfileTabs
					activeTab={activeTab}
					onTabChange={setActiveTab}
					counts={counts}
					games={tabGames}
					profileGames={profileGames}
					loading={loadingGames}
					isOwnProfile={isOwnProfile}
					username={profile.username}
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={setCurrentPage}
				/>

				<ListsSection lists={profile.lists || []} isOwnProfile={isOwnProfile} username={profile.username} />
			</div>

			{followModal && <FollowListModal title={followModal} userId={profile.id} onClose={() => setFollowModal(null)} />}
			{settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
		</div>
	)
}

