import { useRef } from "react"
import { Activity } from "lucide-react"
import BioSection from "../components/BioSection"
import ProfileTabs from "../components/ProfileTabs"
import ProfileReviews from "../components/ProfileReviews"
import ProfileLikes from "../components/ProfileLikes"
import ListsSection from "../components/ListsSection"
import TierlistsSection from "@components/Tierlist/TierlistsSection"

export function ProfileContent({
	activeSection,
	profile,
	isOwnProfile,
	games,
	counts,
	loadingGames,
	activeTab,
	gamesPage,
	gamesTotalPages,
	onTabChange,
	onGamesPageChange,
	lists,
	setLists,
	loadingLists,
	listsPage,
	listsTotalPages,
	listsTotal,
	onListsPageChange,
	tierlists,
	setTierlists,
	loadingTierlists,
	tierlistsPage,
	tierlistsTotalPages,
	tierlistsTotal,
	onTierlistsPageChange,
	onEditProfile,
}) {
	const tabsRef = useRef(null)

	function handleGamesPageChange(newPage) {
		onGamesPageChange(newPage)
		const el = tabsRef.current
		if (el) {
			const y = el.getBoundingClientRect().top + window.scrollY - 24
			window.scrollTo({ top: y, behavior: "smooth" })
		}
	}

	return (
		<div className="mt-6">
			{activeSection === "profile" && (
				<BioSection
					bio={profile.bio}
					isOwnProfile={isOwnProfile}
					onEdit={onEditProfile}
				/>
			)}

			{activeSection === "games" && (
				<ProfileTabs
					ref={tabsRef}
					activeTab={activeTab}
					onTabChange={onTabChange}
					counts={counts}
					games={games}
					loading={loadingGames}
					isOwnProfile={isOwnProfile}
					username={profile.username}
					currentPage={gamesPage}
					totalPages={gamesTotalPages}
					onPageChange={handleGamesPageChange}
				/>
			)}

			{activeSection === "lists" && (
				<ListsSection
					lists={lists}
					setLists={setLists}
					isOwnProfile={isOwnProfile}
					username={profile.username}
					loading={loadingLists}
					currentPage={listsPage}
					totalPages={listsTotalPages}
					total={listsTotal}
					onPageChange={onListsPageChange}
				/>
			)}

			{activeSection === "tierlists" && (
				<TierlistsSection
					tierlists={tierlists}
					setTierlists={setTierlists}
					isOwnProfile={isOwnProfile}
					username={profile.username}
					loading={loadingTierlists}
					currentPage={tierlistsPage}
					totalPages={tierlistsTotalPages}
					total={tierlistsTotal}
					onPageChange={onTierlistsPageChange}
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



