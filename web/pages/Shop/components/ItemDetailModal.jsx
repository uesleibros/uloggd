import { Loader2, Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import PriceDisplay from "./PriceDisplay"
import AvatarDecorationPreview from "./AvatarDecorationPreview"
import { MINERALS } from "@components/Minerals/MineralRow"

export default function ItemDetailModal({ item, owned, equipped, onClose, onPurchase, onEquip, purchasing, equipping, user }) {
  const { t } = useTranslation("shop")
  if (!item) return null

  const isSoldOut = item.is_limited && item.current_stock === 0
  const hasPrice = MINERALS.some(m => (item[`price_${m.key}`] || 0) > 0)
  const isAvatarDecoration = item.item_type === "avatar_decoration"
  const artists = (item.artists || []).filter(entry => entry?.artist)

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80">
        <div className="relative bg-gradient-to-b from-zinc-800/30 to-zinc-900 flex items-center justify-center p-10 min-h-[220px]">
          {isAvatarDecoration && item.asset_url && user ? (
            <AvatarDecorationPreview item={item} user={user} />
          ) : item.asset_url ? (
            <img
              src={item.asset_url}
              alt={item.name}
              className="max-w-[160px] max-h-[160px] object-contain select-none"
              draggable={false}
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-zinc-800/40" />
          )}

          <div className="absolute top-3 left-3 flex gap-1.5">
            {item.is_featured && (
              <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-violet-500/15 text-violet-400 rounded">
                ✦ {t("tags.featured")}
              </span>
            )}
            {item.is_limited && (
              <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 rounded">
                {t("tags.limited")}
              </span>
            )}
            {owned && (
              <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 rounded flex items-center gap-0.5">
                <Check className="w-2 h-2" />
                {t("tags.owned")}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
            {t(`types.${item.item_type}`, item.item_type?.replace(/_/g, " "))}
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5 mb-1.5">{item.name}</h2>

          {item.description && (
            <p className="text-sm text-zinc-500 leading-relaxed mb-4">{item.description}</p>
          )}

          {artists.length > 0 && (
            <div className="mb-4">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium mb-2 block">
                {t("artists.itemCredits")}
              </span>
              <div className="flex flex-wrap gap-2">
                {artists.map(({ artist, is_primary }) => {
                  const content = (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors">
                      <img
                        src={artist.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png"}
                        alt={artist.name}
                        className="w-5 h-5 rounded-full object-cover select-none"
                        draggable={false}
                      />
                      <span className="text-xs text-zinc-300">{artist.name}</span>
                      {is_primary && (
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                          {t("artists.primary")}
                        </span>
                      )}
                    </div>
                  )

                  return artist.url ? (
                    <a
                      key={artist.id}
                      href={artist.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={artist.id}>{content}</div>
                  )
                })}
              </div>
            </div>
          )}

          {item.is_limited && item.max_stock != null && !owned && (
            <p className="text-xs text-zinc-500 mb-4">
              {isSoldOut
                ? t("detail.soldOutLabel")
                : `${item.current_stock} / ${item.max_stock} ${t("detail.remaining")}`}
            </p>
          )}

          {item.available_until && !owned && (
            <p className="text-xs text-zinc-500 mb-4">
              {t("detail.availableUntil")} {new Date(item.available_until).toLocaleDateString()}
            </p>
          )}

          {!owned && hasPrice && (
            <div className="p-3.5 rounded-lg bg-zinc-800/50 mb-5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium mb-2 block">
                {t("detail.price")}
              </span>
              <PriceDisplay item={item} size="lg" />
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
            >
              {t("detail.close")}
            </button>

            {owned ? (
              equipped ? (
                <div className="flex-1 px-4 py-2.5 text-sm font-medium text-emerald-400/80 bg-emerald-500/10 rounded-lg flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {t("detail.equipped")}
                </div>
              ) : (
                <button
                  onClick={onEquip}
                  disabled={equipping}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {equipping ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t("detail.equip")
                  )}
                </button>
              )
            ) : isSoldOut ? (
              <div className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-800/50 rounded-lg flex items-center justify-center">
                {t("detail.soldOut")}
              </div>
            ) : user ? (
              <button
                onClick={() => onPurchase(item)}
                disabled={purchasing}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {purchasing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  t("detail.purchase")
                )}
              </button>
            ) : (
              <div className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-800/50 rounded-lg flex items-center justify-center text-center">
                {t("detail.loginRequired")}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}