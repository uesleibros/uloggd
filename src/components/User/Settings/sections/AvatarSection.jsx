import SettingsSection from "../ui/SettingsSection"
import AvatarEditor from "../../AvatarEditor"

export default function AvatarSection({ avatar, onSave, saving }) {
  return (
    <SettingsSection title="Avatar" description="Personalize o avatar do seu perfil. Recomendado: 512x512px.">
      <AvatarEditor currentAvatar={avatar} onSave={onSave} saving={saving} />
    </SettingsSection>
  )
}