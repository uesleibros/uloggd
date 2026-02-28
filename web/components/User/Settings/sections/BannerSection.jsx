import { useTranslation } from "#hooks/useTranslation"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import BannerEditor from "@components/User/BannerEditor"

export default function BannerSection({ banner, onSave, saving }) {
  const { t } = useTranslation()

  return (
    <SettingsSection
      title={t("settings.bannerSection.title")}
      description={t("settings.bannerSection.description")}
    >
      <BannerEditor currentBanner={banner} onSave={onSave} saving={saving} />
    </SettingsSection>
  )
}
