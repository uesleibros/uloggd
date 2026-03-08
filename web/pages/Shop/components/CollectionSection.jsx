import { ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { ITEMS_PREVIEW_COUNT } from "../utils/shopHelpers"
import ItemCard from "./ItemCard"
import TimeBadge from "./TimeBadge"

export default function CollectionSection({ collection, ownedItemIds, isEquipped, onSelectItem, onViewAll }) {
  const { t } = useTranslation("shop")
  const items = collection.items || []
  const previewItems = items.slice(0, ITEMS_PREVIEW_COUNT)
  const hasMore = items.length > ITEMS_PREVIEW_COUNT

  return (
    <section className="mb-10 last:mb-0">
      {collection.banner_url ? (
        <button
          onClick={() => onViewAll(collection)}
          className="relative w-full cursor-pointer group text-left mb-5"
        >
          <img
            src={collection.banner_url}
            alt={collection.name}
            className="w-full h-auto block group-hover:brightness-110 transition-all duration-300 select-none"
            draggable={false}
          />
        </button>
      ) : (
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="w-0.5 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: collection.accent_color || "#8b5cf6" }}
              />
              <h2 className="text-base font-semibold text-white">{collection.name}</h2>
              {collection.available_until && <TimeBadge availableUntil={collection.available_until} />}
            </div>
            {collection.description && (
              <p className="text-xs text-zinc-500 mt-1 ml-3">{collection.description}</p>
            )}
          </div>

          {hasMore && (
            <button
              onClick={() => onViewAll(collection)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              {t("collection.viewAll")}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {previewItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {previewItems.map(item => (
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

      {hasMore && collection.banner_url && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => onViewAll(collection)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-lg transition-all cursor-pointer"
          >
            {t("collection.viewAll")}
            <span className="text-zinc-600">· {items.length}</span>
          </button>
        </div>
      )}
    </section>
  )
}