import { useState } from "react"
import { useParams, Link } from "react-router-dom"
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

        <ProfileNavigation
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          counts={counts}
          listsCount={userLists.length}
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