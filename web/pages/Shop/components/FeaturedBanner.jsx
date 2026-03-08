import { ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import TimeBadge from "./TimeBadge"

export default function FeaturedBanner({ collection, onClick }) {
  const { t } = useTranslation("shop")

  return (
    <button
      onClick={() => onClick(collection)}
      className="relative w-full overflow-hidden rounded-xl transition-all cursor-pointer group text-left hover:ring-1 hover:ring-zinc-700/50"
    >
      {collection.banner_url ? (
        <div className="relative h-44 sm:h-56 overflow-hidden rounded-xl">
          <img
            src={collection.banner_url}
            alt={collection.name}
            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500 select-none"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
        </div>
      ) : (
        <div
          className="h-44 sm:h-56 rounded-xl"
          style={{
            background: collection.accent_color
              ? `linear-gradient(135deg, ${collection.accent_color}18, ${collection.accent_color}06, transparent)`
              : "linear-gradient(135deg, rgba(139,92,246,0.09), rgba(139,92,246,0.03), transparent)",
          }}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 sm:px-8 sm:pb-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest bg-white/10 text-white/60 rounded mb-2.5 backdrop-blur-sm">
              {t("collection.featured")}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-0.5">{collection.name}</h2>
            {collection.description && (
              <p className="text-sm text-zinc-400 line-clamp-2 max-w-md">{collection.description}</p>
            )}
            {collection.available_until && (
              <div className="mt-2">
                <TimeBadge availableUntil={collection.available_until} />
              </div>
            )}
          </div>
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/8 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/15 transition-colors">
            <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  )
}