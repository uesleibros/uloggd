import { Heart, ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export default function ArtistCredits() {
  const { t } = useTranslation("shop")

  return (
    <div className="mb-8 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-pink-500/15 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-300">{t("credits.message")}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t("credits.submessage")}</p>
          </div>
        </div>
        <a
          href="https://jellys-space.vip/?page=donate"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-xs font-medium text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 rounded-lg transition-all flex items-center gap-2"
        >
          {t("credits.donate")}
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}