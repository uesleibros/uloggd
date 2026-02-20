import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import SaveActions from "@components/User/Settings/ui/SaveActions"

export default function PronounSection({ pronoun, onChange, onSave, onReset, saving, isDirty }) {
  return (
    <SettingsSection title="Pronome" description="Exibido no seu perfil ao lado do seu nome.">
      <input
        type="text"
        value={pronoun}
        onChange={(e) => onChange(e.target.value)}
        maxLength={30}
        placeholder="ex: ele/dele, she/her..."
        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
      />
      <SaveActions onSave={onSave} onReset={onReset} saving={saving} isDirty={isDirty} />
    </SettingsSection>
  )
}