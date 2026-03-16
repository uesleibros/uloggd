import { useRef } from "react"
import { useTranslation } from "#hooks/useTranslation"
import BioSection from "../components/BioSection"
import ProfileTabs from "../components/ProfileTabs"
import ProfileReviews from "../components/ProfileReviews"
import ProfileLikes from "../components/ProfileLikes"
import ListsSection from "@components/Lists/ListsSection"
import TierlistsSection from "@components/Tierlist/TierlistsSection"
import TransactionsSection from "./TransactionsSection"
import JourneysSection from "@components/Game/Journal/JourneysSection"
import CommentSection from "@components/UI/CommentSection"

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
  journeys,
  journeyGames,
  loadingJourneys,
  journeysPage,
  journeysTotalPages,
  journeysTotal,
  onJourneysPageChange,
  onJourneysUpdate,
  onEditProfile,
  likesCounts,
}) {
  const { t } = useTranslation("profile")
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
    <div className="mt-4">
      {activeSection === "profile" && (
        <div className="space-y-8">
          <BioSection
            bio={profile.bio}
            profileId={profile.user_id}
            onEdit={onEditProfile}
          />
          <CommentSection type="profile" targetId={profile.user_id} />
        </div>
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

      {activeSection === "journeys" && (
        <JourneysSection
          journeys={journeys}
          ownerId={profile.user_id}
          games={journeyGames}
          loading={loadingJourneys}
          total={journeysTotal}
          currentPage={journeysPage}
          totalPages={journeysTotalPages}
          onPageChange={onJourneysPageChange}
          onUpdate={onJourneysUpdate}
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
        <ProfileReviews userId={profile.user_id} />
      )}

      {activeSection === "likes" && (
        <ProfileLikes
          userId={profile.user_id}
          isOwnProfile={isOwnProfile}
          username={profile.username}
          initialCounts={likesCounts}
        />
      )}

      {activeSection === "transactions" && (
        <TransactionsSection userId={profile.user_id} />
      )}
    </div>
  )
}