import { useTranslation } from "#hooks/useTranslation"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import SaveActions from "@components/User/Settings/ui/SaveActions"
import { MarkdownEditor } from "@components/MarkdownEditor"

export default function BioSection({ bio, onChange, onSave, onReset, saving, isDirty }) {
  const { t } = useTranslation()

  return (
    <SettingsSection
      title={t("settings.bio.title")}
      description={t("settings.bio.description")}
    >
      <MarkdownEditor
        value={bio}
        onChange={onChange}
        maxLength={10000}
        placeholder={t("settings.bio.placeholder")}
      />
      <SaveActions onSave={onSave} onReset={onReset} saving={saving} isDirty={isDirty} />
    </SettingsSection>
  )
}
