import { useRef, useState } from "react"
import { Activity } from "lucide-react"
import BioSection from "../components/BioSection"
import ProfileTabs from "../components/ProfileTabs"
import ProfileReviews from "../components/ProfileReviews"
import ProfileLikes from "../components/ProfileLikes"
import ListsSection from "../components/ListsSection"
import { filterGamesByTab } from "#hooks/useProfileGames"

const GAMES_PER_PAGE = 24

export function ProfileContent({
	activeSection,
	profile,
	profileGames,
	igdbGames,
	loadingGames,
	counts,
	isOwnProfile,
	userLists,
	setUserLists,
	loadingLists,
	onEditProfile,
}) {
	const [activeTab, setActiveTab] = useState("playing")
	const [currentPage, setCurrentPage] = useState(1)
	const tabsRef = useRef(null)

	const allTabGames = filterGamesByTab(profileGames, igdbGames, activeTab)
	const totalPages = Math.ceil(allTabGames.length / GAMES_PER_PAGE)
	const tabGames = allTabGames.slice(
		(currentPage - 1) * GAMES_PER_PAGE,
		currentPage * GAMES_PER_PAGE
	)

	function handlePageChange(page) {
		setCurrentPage(page)
		const el = tabsRef.current
		if (el) {
			const y = el.getBoundingClientRect().top + window.scrollY - 24
			window.scrollTo({ top: y, behavior: "smooth" })
		}
	}

	function handleTabChange(tab) {
		setActiveTab(tab)
		setCurrentPage(1)
	}

	return (
		<div className="mt-6">
			{activeSection === "profile" && (
				<BioSection
					bio={profile.bio}
					isOwnProfile={isOwnProfile}
					onEdit={onEditProfile}
					profileGames={profileGames}
				/>
			)}

			{activeSection === "games" && (
				<ProfileTabs
					ref={tabsRef}
					activeTab={activeTab}
					onTabChange={handleTabChange}
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
					lists={userLists}
					setLists={setUserLists}
					isOwnProfile={isOwnProfile}
					username={profile.username}
					loading={loadingLists}
				/>
			)}

			{activeSection === "reviews" && (
				<ProfileReviews userId={profile.id} />
			)}

			{activeSection === "likes" && (
				<ProfileLikes userId={profile.id} isOwnProfile={isOwnProfile} username={profile.username} />
			)}

			{activeSection === "activity" && (
				<div className="flex flex-col items-center justify-center py-16 gap-3">
					<Activity className="w-10 h-10 text-zinc-700" />
					<p className="text-sm text-zinc-600">Atividade em breve</p>
				</div>
			)}
		</div>
	)
}