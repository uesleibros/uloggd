import SettingsSection from "../ui/SettingsSection"
import SaveActions from "../ui/SaveActions"
import { MarkdownEditor } from "../../../MarkdownEditor"

export default function BioSection({ bio, onChange, onSave, onReset, saving, isDirty }) {
  return (
    <SettingsSection title="Sobre mim" description="Escreva uma bio para o seu perfil. Suporta Markdown.">
      <MarkdownEditor
        value={bio}
        onChange={onChange}
        maxLength={10000}
        placeholder="Escreva sobre você..."
      />
      <SaveActions onSave={onSave} onReset={onReset} saving={saving} isDirty={isDirty} />
    </SettingsSection>
  )
}