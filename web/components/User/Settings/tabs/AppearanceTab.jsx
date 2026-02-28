import { useTranslation } from "#hooks/useTranslation"
import DecorationSection from "@components/User/Settings/sections/DecorationSection"
import ThemeSection from "@components/User/Settings/sections/ThemeSection"

export default function AppearanceTab({
  user,
  selectedDecoration, onSelectDecoration,
  onDecorationSave, onDecorationReset,
  decorationSaving, decorationIsDirty,
}) {
  const { t } = useTranslation("settings")

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">
        {t("appearance.title")}
      </h2>

      <p className="text-sm text-zinc-500 mt-1 mb-6">
        {t("appearance.description")}
      </p>

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
