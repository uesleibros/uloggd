import { useTranslation } from "#hooks/useTranslation"
import AvatarSection from "@components/User/Settings/sections/AvatarSection"
import BannerSection from "@components/User/Settings/sections/BannerSection"
import BioSection from "@components/User/Settings/sections/BioSection"
import PronounSection from "@components/User/Settings/sections/PronounSection"
import ProfileSection from "@components/User/Settings/sections/ProfileSection"
import DangerZoneSection from "@components/User/Settings/sections/DangerZoneSection"

export default function AccountTab({
	user,
	onAvatarSave, avatarSaving,
	onBannerSave, bannerSaving,
	bio, onBioChange, onBioSave, onBioReset, bioSaving, bioIsDirty,
	pronoun, onPronounChange, onPronounSave, onPronounReset, pronounSaving, pronounIsDirty,
	onUsernameSave, usernameSaving,
	onDelete, deleteLoading,
}) {
	const { t } = useTranslation("settings")

	return (
		<div>
			<h2 className="text-lg font-semibold text-white">
				{t("layout.tabs.account")}
			</h2>

			<p className="text-sm text-zinc-500 mt-1 mb-6">
				{t("account.description")}
			</p>

			<div className="space-y-4 sm:space-y-6">
				<AvatarSection avatar={user.avatar || null} onSave={onAvatarSave} saving={avatarSaving} />
				<BannerSection banner={user.banner || null} onSave={onBannerSave} saving={bannerSaving} />
				<BioSection
					bio={bio}
					onChange={onBioChange}
					onSave={onBioSave}
					onReset={onBioReset}
					saving={bioSaving}
					isDirty={bioIsDirty}
				/>
				<PronounSection
					pronoun={pronoun}
					onChange={onPronounChange}
					onSave={onPronounSave}
					onReset={onPronounReset}
					saving={pronounSaving}
					isDirty={pronounIsDirty}
				/>
				<ProfileSection
					user={user}
					onUsernameSave={onUsernameSave}
					usernameSaving={usernameSaving}
				/>
				<DangerZoneSection onDelete={onDelete} loading={deleteLoading} />
			</div>
		</div>
	)
}
