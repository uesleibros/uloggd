import { ChevronLeft } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import ItemCard from "./ItemCard"
import EmptyState from "./EmptyState"
import TimeBadge from "./TimeBadge"

export default function CollectionFullView({ collection, ownedItemIds, isEquipped, onSelectItem, onBack }) {
  const { t } = useTranslation("shop")
  const items = collection.items || []

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer mb-5"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        {t("collection.back")}
      </button>

      <div className="mb-6">
        {collection.banner_url ? (
          <img
            src={collection.banner_url}
            alt={collection.name}
            className="w-full h-auto block select-none"
            draggable={false}
          />
        ) : (
          <div
            className="px-5 py-6 rounded-xl"
            style={{
              background: collection.accent_color
                ? `linear-gradient(135deg, ${collection.accent_color}12, transparent)`
                : "linear-gradient(135deg, rgba(139,92,246,0.06), transparent)",
            }}
          >
            <h2 className="text-lg font-bold text-white mb-0.5">{collection.name}</h2>
            {collection.description && (
              <p className="text-sm text-zinc-400">{collection.description}</p>
            )}
          </div>
        )}
      </div>

      <span className="text-xs text-zinc-600 mb-4 block">
        {items.length} {items.length === 1 ? t("collection.itemCount") : t("collection.itemsCount")}
      </span>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              owned={ownedItemIds.has(item.id)}
              equipped={isEquipped(item.id)}
              onSelect={onSelectItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}