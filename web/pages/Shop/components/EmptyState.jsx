import { useTranslation } from "#hooks/useTranslation"

export default function EmptyState() {
  const { t } = useTranslation("shop")

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-800/50 mb-4" />
      <h3 className="text-sm font-medium text-zinc-400 mb-1">{t("empty.title")}</h3>
      <p className="text-xs text-zinc-600 max-w-xs">{t("empty.description")}</p>
    </div>
  )
}