import { useTranslation } from "#hooks/useTranslation"

export default function FeaturedBanner({ collection, onClick }) {
  const { t } = useTranslation("shop")

  if (collection.banner_url) {
    return (
      <button
        onClick={() => onClick(collection)}
        className="relative w-full cursor-pointer group text-left"
      >
        <img
          src={collection.banner_url}
          alt={collection.name}
          className="w-full h-auto block group-hover:brightness-110 transition-all duration-300 select-none"
          draggable={false}
        />
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick(collection)}
      className="relative w-full overflow-hidden rounded-xl transition-all cursor-pointer group text-left hover:ring-1 hover:ring-zinc-700/50 h-44 sm:h-56"
      style={{
        background: collection.accent_color
          ? `linear-gradient(135deg, ${collection.accent_color}18, ${collection.accent_color}06, transparent)`
          : "linear-gradient(135deg, rgba(139,92,246,0.09), rgba(139,92,246,0.03), transparent)",
      }}
    >
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 sm:px-8 sm:pb-7">
        <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest bg-white/10 text-white/60 rounded mb-2.5">
          {t("collection.featured")}
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-0.5">{collection.name}</h2>
        {collection.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 max-w-md">{collection.description}</p>
        )}
      </div>
    </button>
  )
}