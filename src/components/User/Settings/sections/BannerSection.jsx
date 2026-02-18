import SettingsSection from "../ui/SettingsSection"
import BannerEditor from "../../BannerEditor"

export default function BannerSection({ banner, onSave, saving }) {
  return (
    <SettingsSection title="Banner" description="Personalize o banner do seu perfil. Recomendado: 1500x375px.">
      <BannerEditor currentBanner={banner} onSave={onSave} saving={saving} />
    </SettingsSection>
  )
}