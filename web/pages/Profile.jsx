import { useEffect, useState, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import usePageMeta from "#hooks/usePageMeta"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"
import { useProfileGames, filterGamesByTab } from "#hooks/useProfileGames"
import UserBadges from "@components/User/UserBadges"
import PageBanner from "@components/Layout/PageBanner"
import ThinkingBubble from "@components/User/ThinkingBubble"
import SettingsModal from "@components/User/Settings/SettingsModal"
import ProfileSkeleton from "@components/Profile/ProfileSkeleton"
import ProfileActions from "@components/Profile/ProfileActions"
import ProfileStats from "@components/Profile/ProfileStats"
import ProfileTabs from "@components/Profile/ProfileTabs"
import BioSection from "@components/Profile/BioSection"
import ListsSection from "@components/Profile/ListsSection"
import FollowListModal from "@components/Profile/FollowListModal"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import { User, Gamepad2, ListChecks, Activity } from "lucide-react"

const GAMES_PER_PAGE = 24

const PROFILE_SECTIONS = [
	{ id: "profile", label: "Perfil", icon: User },
	{ id: "games", label: "Jogos", icon: Gamepad2 },
	{ id: "lists", label: "Listas", icon: ListChecks },
	{ id: "activity", label: "Atividade", icon: Activity },
]

export default function Profile() {
	const { username } = useParams()
	const { user: currentUser, loading: authLoading } = useAuth()
	const [profile, setProfile] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [activeSection, setActiveSection] = useState("profile")
	const [activeTab, setActiveTab] = useState("playing")
	const [currentPage, setCurrentPage] = useState(1)
	const [isFollowing, setIsFollowing] = useState(false)
	const [followLoading, setFollowLoading] = useState(false)
	const [followsYou, setFollowsYou] = useState(false)
	const [followersCount, setFollowersCount] = useState(0)
	const [followingCount, setFollowingCount] = useState(0)
	const [followModal, setFollowModal] = useState(null)
	const [settingsOpen, setSettingsOpen] = useState(false)

	const tabsRef = useRef(null)
	const sectionNavRef = useRef(null)

	const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase()
	const { profileGames, counts, igdbGames, loadingGames } = useProfileGames(profile?.id)

	usePageMeta(profile ? {
		title: `${profile.username} - uloggd`,
		description: `Perfil de ${profile.username} no uloggd`,
		image: profile.avatar || undefined,
	} : undefined)

	useEffect(() => { setCurrentPage(1) }, [activeTab])

	useEffect(() => {
		setActiveSection("profile")
	}, [username])

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

	function handlePageChange(page) {
		setCurrentPage(page)
		const el = tabsRef.current
		if (el) {
			const y = el.getBoundingClientRect().top + window.scrollY - 24
			window.scrollTo({ top: y, behavior: "smooth" })
		}
	}

	function handleSectionChange(sectionId) {
		setActiveSection(sectionId)
		if (sectionNavRef.current) {
			const y = sectionNavRef.current.getBoundingClientRect().top + window.scrollY - 16
			window.scrollTo({ top: y, behavior: "smooth" })
		}
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

	const listsCount = profile.lists?.length || 0

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
							<div className="absolute z-20 left-[15%] sm:left-[13%] md:left-[65%]" style={{ bottom: 'calc(100% - 1px)' }}>
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
						{profile.pronoun && (
							<span className="text-xs mt-1 bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">{profile.pronoun}</span>
						)}
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

				<div ref={sectionNavRef} className="mt-8 border-b border-zinc-800/80">
					<nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
						{PROFILE_SECTIONS.map(({ id, label, icon: Icon }) => {
							const isActive = activeSection === id
							let badge = null
							if (id === "games" && counts.total > 0) badge = counts.total
							if (id === "lists" && listsCount > 0) badge = listsCount

							return (
								<button
									key={id}
									onClick={() => handleSectionChange(id)}
									className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
										isActive
											? "text-indigo-400"
											: "text-zinc-500 hover:text-zinc-300"
									}`}
								>
									<Icon className={`w-4 h-4 transition-colors ${
										isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"
									}`} />
									{label}
									{badge != null && (
										<span className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums transition-colors ${
											isActive
												? "bg-indigo-500/15 text-indigo-400"
												: "bg-zinc-800 text-zinc-500 group-hover:text-zinc-400"
										}`}>
											{badge}
										</span>
									)}
									{isActive && (
										<div className="absolute bottom-0 left-2 right-2 h-[2px] bg-indigo-500 rounded-t-full" />
									)}
								</button>
							)
						})}
					</nav>
				</div>

				<div className="mt-6">
					{activeSection === "profile" && (
						<BioSection
							bio={profile.bio}
							isOwnProfile={isOwnProfile}
							onEdit={() => setSettingsOpen(true)}
							profileGames={profileGames}
						/>
					)}

					{activeSection === "games" && (
						<ProfileTabs
							ref={tabsRef}
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
							onPageChange={handlePageChange}
						/>
					)}

					{activeSection === "lists" && (
						<ListsSection
							lists={profile.lists || []}
							isOwnProfile={isOwnProfile}
							username={profile.username}
						/>
					)}

					{activeSection === "activity" && (
						<div className="flex flex-col items-center justify-center py-16 gap-3">
							<Activity className="w-10 h-10 text-zinc-700" />
							<p className="text-sm text-zinc-600">Atividade em breve</p>
						</div>
					)}
				</div>
			</div>

			<FollowListModal
				isOpen={!!followModal}
				title={followModal || ""}
				userId={profile.id}
				onClose={() => setFollowModal(null)}
			/>
			<SettingsModal
				isOpen={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
		</div>
	)
}
