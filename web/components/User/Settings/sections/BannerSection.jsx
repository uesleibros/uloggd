import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import BannerEditor from "@components/User/BannerEditor"

export default function BannerSection({ banner, onSave, saving }) {
  return (
    <SettingsSection title="Banner" description="Personalize o banner do seu perfil. Recomendado: 1500x375px.">
      <BannerEditor currentBanner={banner} onSave={onSave} saving={saving} />
    </SettingsSection>
  )
}