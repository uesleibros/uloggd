import { useTranslation } from "#hooks/useTranslation"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import AvatarEditor from "@components/User/AvatarEditor"

export default function AvatarSection({ avatar, onSave, saving }) {
  const { t } = useTranslation()

  return (
    <SettingsSection
      title={t("settings.avatarSection.title")}
      description={t("settings.avatarSection.description")}
    >
      <AvatarEditor currentAvatar={avatar} onSave={onSave} saving={saving} />
    </SettingsSection>
  )
}
