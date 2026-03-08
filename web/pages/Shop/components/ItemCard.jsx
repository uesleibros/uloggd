import { Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import PriceDisplay from "./PriceDisplay"

export default function ItemCard({ item, owned, equipped, onSelect }) {
  const { t } = useTranslation("shop")
  const isSoldOut = item.is_limited && item.current_stock === 0

  return (
    <button
      onClick={() => onSelect(item)}
      className={`group relative w-full text-left rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
        isSoldOut
          ? "bg-zinc-900/60 opacity-50 pointer-events-none"
          : "bg-zinc-800/40 hover:bg-zinc-800/70 hover:ring-1 hover:ring-zinc-700/60"
      }`}
    >
      <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1 items-end">
        {item.is_featured && (
          <span className="px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-400 rounded">
            ✦ {t("tags.featured")}
          </span>
        )}
        {item.is_limited && !isSoldOut && item.max_stock != null && (
          <span className={`px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider rounded ${
            item.current_stock / item.max_stock <= 0.2
              ? "bg-rose-500/15 text-rose-400"
              : "bg-amber-500/15 text-amber-400"
          }`}>
            {item.current_stock}/{item.max_stock}
          </span>
        )}
        {isSoldOut && (
          <span className="px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider bg-zinc-700/60 text-zinc-400 rounded">
            {t("tags.soldOut")}
          </span>
        )}
        {equipped && (
          <span className="px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 rounded flex items-center gap-0.5">
            <Check className="w-2 h-2" />
            {t("tags.equipped")}
          </span>
        )}
        {owned && !equipped && (
          <span className="px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider bg-zinc-700/50 text-zinc-400 rounded flex items-center gap-0.5">
            <Check className="w-2 h-2" />
            {t("tags.owned")}
          </span>
        )}
      </div>

      <div className="aspect-square bg-gradient-to-b from-zinc-800/10 to-zinc-900/30 flex items-center justify-center p-6 sm:p-8">
        {item.asset_url ? (
          <img
            src={item.asset_url}
            alt={item.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 select-none"
            draggable={false}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-zinc-800/60" />
        )}
      </div>

      <div className="px-3.5 pb-3.5 pt-0">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
          {t(`types.${item.item_type}`, item.item_type?.replace(/_/g, " "))}
        </span>
        <h3 className="text-[13px] font-semibold text-zinc-200 truncate mt-0.5 mb-2">{item.name}</h3>
        {!owned && <PriceDisplay item={item} />}
        {owned && !equipped && (
          <span className="text-[11px] text-zinc-600">{t("card.ownedHint")}</span>
        )}
        {equipped && (
          <span className="text-[11px] text-emerald-500/80">{t("card.equippedHint")}</span>
        )}
      </div>
    </button>
  )
}