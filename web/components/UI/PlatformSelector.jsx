import { Gamepad2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export default function PlatformSelector({ value, onChange, platforms }) {
  const { t } = useTranslation("common")

  if (!platforms || platforms.length === 0) {
    return (
      <div className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-500 text-sm flex items-center gap-2">
        <Gamepad2 className="w-4 h-4" />
        {t("noPlatforms")}
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center"
      }}
    >
      <option value="">{t("selectPlatform")}</option>
      {platforms.map((p) => (
        <option key={p.id} value={p.id.toString()}>
          {p.name}
        </option>
      ))}
    </select>
  )
}