import DecorationSection from "../sections/DecorationSection"
import ThemeSection from "../sections/ThemeSection"

export default function AppearanceTab({
  user,
  selectedDecoration, onSelectDecoration,
  onDecorationSave, onDecorationReset,
  decorationSaving, decorationIsDirty,
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Aparência</h2>
      <p className="text-sm text-zinc-500 mt-1 mb-6">Personalize como seu perfil aparece.</p>

      <div className="space-y-4 sm:space-y-6">
        <DecorationSection
          user={user}
          selected={selectedDecoration}
          onSelect={onSelectDecoration}
          onSave={onDecorationSave}
          onReset={onDecorationReset}
          saving={decorationSaving}
          isDirty={decorationIsDirty}
        />
        <ThemeSection />
      </div>
    </div>
  )
}