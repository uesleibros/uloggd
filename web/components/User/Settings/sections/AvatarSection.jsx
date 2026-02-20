import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import AvatarEditor from "@components/User/AvatarEditor"

export default function AvatarSection({ avatar, onSave, saving }) {
  return (
    <SettingsSection title="Avatar" description="Personalize o avatar do seu perfil. Recomendado: 512x512px.">
      <AvatarEditor currentAvatar={avatar} onSave={onSave} saving={saving} />
    </SettingsSection>
  )
}