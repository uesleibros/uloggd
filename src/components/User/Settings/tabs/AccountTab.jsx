import AvatarSection from "../sections/AvatarSection"
import BannerSection from "../sections/BannerSection"
import BioSection from "../sections/BioSection"
import ProfileSection from "../sections/ProfileSection"
import DangerZoneSection from "../sections/DangerZoneSection"

export default function AccountTab({
  user,
  onAvatarSave, avatarSaving,
  onBannerSave, bannerSaving,
  bio, onBioChange, onBioSave, onBioReset, bioSaving, bioIsDirty,
  onDelete, deleteLoading,
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Minha conta</h2>
      <p className="text-sm text-zinc-500 mt-1 mb-6">Informações da sua conta vinculada ao Discord.</p>

      <div className="space-y-4 sm:space-y-6">
        <AvatarSection avatar={user.avatar || null} onSave={onAvatarSave} saving={avatarSaving} />
        <BannerSection banner={user.banner || null} onSave={onBannerSave} saving={bannerSaving} />
        <BioSection bio={bio} onChange={onBioChange} onSave={onBioSave} onReset={onBioReset} saving={bioSaving} isDirty={bioIsDirty} />
        <ProfileSection user={user} />
        <DangerZoneSection onDelete={onDelete} loading={deleteLoading} />
      </div>
    </div>
  )
}