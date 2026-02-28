import { useTranslation } from "#hooks/useTranslation"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import SaveActions from "@components/User/Settings/ui/SaveActions"

export default function PronounSection({ pronoun, onChange, onSave, onReset, saving, isDirty }) {
  const { t } = useTranslation()

  return (
    <SettingsSection title={t("settings.pronoun.title")} description={t("settings.pronoun.description")}>
      <input
        type="text"
        value={pronoun}
        onChange={(e) => onChange(e.target.value)}
        maxLength={30}
        placeholder={t("settings.pronoun.placeholder")}
        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
      />
      <SaveActions onSave={onSave} onReset={onReset} saving={saving} isDirty={isDirty} />
    </SettingsSection>
  )
}
