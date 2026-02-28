import { useTranslation } from "#hooks/useTranslation"
import BackloggdSection from "@components/User/Settings/sections/BackloggdSection"

export default function IntegrationsTab() {
  const { t } = useTranslation("settings")

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">
        {t("integrations.title")}
      </h2>

      <p className="text-sm text-zinc-500 mt-1 mb-6">
        {t("integrations.description")}
      </p>

      <BackloggdSection />
    </div>
  )
}
