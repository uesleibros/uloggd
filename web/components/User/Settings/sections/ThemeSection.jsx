import { Palette } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"

export default function ThemeSection() {
  const { t } = useTranslation()

  return (
    <SettingsSection title={t("settings.theme.title")}>
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
          <Palette className="w-6 h-6" />
        </div>
        <p className="text-sm text-zinc-500">{t("settings.theme.comingSoon")}</p>
      </div>
    </SettingsSection>
  )
}
