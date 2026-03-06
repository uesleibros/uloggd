import { useTranslation } from "#hooks/useTranslation"
import PasskeySection from "@components/User/Settings/sections/PasskeySection"

export default function SecurityTab() {
  const { t } = useTranslation("settings")

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">
        {t("security.title")}
      </h2>

      <p className="text-sm text-zinc-500 mt-1 mb-6">
        {t("security.description")}
      </p>

      <div className="space-y-4 sm:space-y-6">
        <PasskeySection />
      </div>
    </div>
  )
}