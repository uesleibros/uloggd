import { useState, useEffect, useCallback } from "react"
import { supabase } from "#lib/supabase.js"
import { Loader2, Check, ChevronRight, ChevronLeft, Heart } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { useAuth } from "#hooks/useAuth"
import { notify } from "@components/UI/Notification"
import { MINERALS } from "@components/Minerals/MineralRow"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"

const ITEMS_PREVIEW_COUNT = 6

const artists = [
  {
    name: "Jelly",
    avatar: "https://cdn.jellys-space.vip/artists/jelly-avatar.png",
    url: "https://discord.com/users/1147940825330876538",
  },
  {
    name: "Seele",
    avatar: "https://cdn.jellys-space.vip/artists/seele-avatar.png",
    url: "https://discord.com/users/334062444718587905",
  },
  {
    name: "Little Glimbo",
    avatar: null,
    url: null
  }
]

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

function ArtistsCarousel() {
  const { t } = useTranslation("shop")
  const fallbackAvatar = "https://cdn.discordapp.com/embed/avatars/0.png"
  const items = artists.length > 0 ? [...artists, ...artists] : []

  if (items.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes artistsMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>

      <div className="mb-8">
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-400">{t("artists.title")}</p>
          <p className="text-xs text-zinc-600">{t("artists.subtitle")}</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

          <div
            className="flex w-max gap-3 px-3 py-3"
            style={{ animation: "artistsMarquee 28s linear infinite" }}
          >
            {items.map((artist, index) => {
              const content = (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-800/40 px-3 py-2 min-w-[180px] hover:bg-zinc-800/70 transition-colors">
                  <img
                    src={artist.avatar || fallbackAvatar}
                    alt={artist.name}
                    className="w-9 h-9 rounded-full object-cover select-none"
                    draggable={false}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{artist.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {artist.label || t("artists.defaultLabel")}
                    </p>
                  </div>
                </div>
              )

              return artist.url ? (
                <a
                  key={`${artist.name}-${index}`}
                  href={artist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  aria-label={`${artist.name} - ${t("artists.visit")}`}
                >
                  {content}
                </a>
              ) : (
                <div key={`${artist.name}-${index}`}>{content}</div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

function ArtistCredits() {
  const { t } = useTranslation("shop")

  return (
    <div className="mb-8 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-pink-500/15 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-300">
              {t("credits.message")}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t("credits.submessage")}
            </p>
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

function PriceDisplay({ item, size = "md" }) {
  const prices = MINERALS
    .filter(m => (item[`price_${m.key}`] || 0) > 0)
    .map(m => ({ ...m, amount: item[`price_${m.key}`] }))

  if (prices.length === 0) {
    return <span className="text-xs text-emerald-400 font-medium">Free</span>
  }

  const isLg = size === "lg"

  return (
    <div className="flex items-center flex-wrap gap-2">
      {prices.map((p, i) => (
        <div key={p.key} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-600 text-xs mr-0.5">+</span>}
          <span
            className={`inline-block rounded-sm flex-shrink-0 ${isLg ? "w-3 h-3" : "w-2 h-2"}`}
            style={{ backgroundColor: p.color }}
          />
          <span
            className={`font-semibold tabular-nums ${isLg ? "text-sm" : "text-xs"}`}
            style={{ color: p.color }}
          >
            {p.amount.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function TimeBadge({ availableUntil }) {
  if (!availableUntil) return null
  const diff = new Date(availableUntil) - new Date()
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const label = days > 0 ? `${days}d left` : hours > 0 ? `${hours}h left` : "Ending soon"

  return (
    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/15 text-blue-400 rounded-full">
      {label}
    </span>
  )
}

function AvatarDecorationPreview({ item, user }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AvatarWithDecoration
        src={user?.avatar}
        alt={user?.username || "Preview"}
        decorationUrl={item.asset_url}
        size="profile"
        showStatus={false}
      />
      <span className="text-xs text-zinc-500 font-medium">Preview</span>
    </div>
  )
}

function ItemCard({ item, owned, equipped, onSelect }) {
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

function CollectionSection({ collection, ownedItemIds, isEquipped, onSelectItem, onViewAll }) {
  const { t } = useTranslation("shop")
  const items = collection.items || []
  const previewItems = items.slice(0, ITEMS_PREVIEW_COUNT)
  const hasMore = items.length > ITEMS_PREVIEW_COUNT

  return (
    <section className="mb-10 last:mb-0">
      {collection.banner_url ? (
        <button
          onClick={() => onViewAll(collection)}
          className="relative w-full overflow-hidden rounded-xl transition-all cursor-pointer group text-left mb-5 hover:ring-1 hover:ring-zinc-700/50"
        >
          <div className="relative h-36 sm:h-44 overflow-hidden rounded-xl">
            <img
              src={collection.banner_url}
              alt={collection.name}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 select-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white mb-0.5">{collection.name}</h2>
                {collection.description && (
                  <p className="text-xs text-zinc-400 line-clamp-1">{collection.description}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
          </div>
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

function CollectionFullView({ collection, ownedItemIds, isEquipped, onSelectItem, onBack }) {
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

      <div className="relative overflow-hidden rounded-xl mb-6">
        {collection.banner_url ? (
          <div className="relative h-40 sm:h-52 overflow-hidden rounded-xl">
            <img
              src={collection.banner_url}
              alt=""
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
              <h2 className="text-lg font-bold text-white mb-0.5">{collection.name}</h2>
              {collection.description && (
                <p className="text-sm text-zinc-400">{collection.description}</p>
              )}
              {collection.available_until && (
                <div className="mt-2">
                  <TimeBadge availableUntil={collection.available_until} />
                </div>
              )}
            </div>
          </div>
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

function FeaturedBanner({ collection, onClick }) {
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
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 select-none"
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

function EmptyState() {
  const { t } = useTranslation("shop")

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-800/50 mb-4" />
      <h3 className="text-sm font-medium text-zinc-400 mb-1">{t("empty.title")}</h3>
      <p className="text-xs text-zinc-600 max-w-xs">{t("empty.description")}</p>
    </div>
  )
}

function ItemDetailModal({ item, owned, equipped, onClose, onPurchase, onEquip, purchasing, equipping, user }) {
  const { t } = useTranslation("shop")
  if (!item) return null

  const isSoldOut = item.is_limited && item.current_stock === 0
  const hasPrice = MINERALS.some(m => (item[`price_${m.key}`] || 0) > 0)
  const isAvatarDecoration = item.item_type === "avatar_decoration"

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

function PurchaseSuccessModal({ isOpen, onClose, item }) {
  const { t } = useTranslation("shop")

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80">
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1.5">{t("success.title")}</h3>
          <p className="text-sm text-zinc-500">
            <span className="text-zinc-300 font-medium">{item?.name}</span>{" "}
            {t("success.description")}
          </p>
        </div>
        <div className="border-t border-zinc-800/60 px-5 py-3.5">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
          >
            {t("success.continue")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function ShopPage() {
  const { user } = useAuth()
  const { t } = useTranslation("shop")

  const [collections, setCollections] = useState([])
  const [inventory, setInventory] = useState([])

  const [loading, setLoading] = useState(true)
  const [activeCollection, setActiveCollection] = useState(null)
  const [activeCollectionItems, setActiveCollectionItems] = useState([])
  const [collectionLoading, setCollectionLoading] = useState(false)

  const [selectedItem, setSelectedItem] = useState(null)
  const [purchasing, setPurchasing] = useState(false)
  const [equipping, setEquipping] = useState(false)
  const [purchasedItem, setPurchasedItem] = useState(null)

  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
  })

  const fetchInventory = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) return []
    try {
      const res = await fetch("/api/shop/@me/inventory", { headers })
      const data = await res.json()
      return data.items || []
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/shop/collections")
        const data = await res.json()
        setCollections(data?.collections || [])
      } catch (e) {
        console.error("Failed to load collections:", e)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!user) {
      setInventory([])
      return
    }
    fetchInventory().then(setInventory)
  }, [user, fetchInventory])

  async function handleViewAll(collection) {
    setActiveCollection(collection)
    setCollectionLoading(true)

    try {
      const res = await fetch(`/api/shop/collections?slug=${collection.slug}`)
      const data = await res.json()
      const col = data?.collections?.[0] || data?.collection
      setActiveCollectionItems(col?.items || collection.items || [])
    } catch (e) {
      console.error("Failed to fetch collection items:", e)
      setActiveCollectionItems(collection.items || [])
    }
    setCollectionLoading(false)
  }

  function handleBackFromCollection() {
    setActiveCollection(null)
    setActiveCollectionItems([])
  }

  async function handlePurchase(item) {
    const headers = await getAuthHeaders()
    if (!headers) {
      notify(t("errors.loginRequired"), "error")
      return
    }

    setPurchasing(true)

    try {
      const res = await fetch("/api/shop/@me/purchase", {
        method: "POST",
        headers,
        body: JSON.stringify({ itemId: item.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        notify(data.error || t("errors.purchaseFailed"), "error")
        setPurchasing(false)
        return
      }

      const inv = await fetchInventory()
      setInventory(inv)

      setSelectedItem(null)
      setTimeout(() => setPurchasedItem(item), 150)
    } catch (e) {
      console.error(e)
      notify(t("errors.generic"), "error")
    }

    setPurchasing(false)
  }

  async function handleEquip(inventoryId, slot) {
    const headers = await getAuthHeaders()
    if (!headers) {
      notify(t("errors.loginRequired"), "error")
      return
    }

    setEquipping(true)

    try {
      const res = await fetch("/api/shop/@me/equip", {
        method: "POST",
        headers,
        body: JSON.stringify({ inventoryId, slot }),
      })

      const data = await res.json()

      if (!res.ok) {
        notify(data.error || t("errors.equipFailed"), "error")
        setEquipping(false)
        return
      }

      const inv = await fetchInventory()
      setInventory(inv)

      setSelectedItem(null)
      notify(t("success.equipped"), "success")
    } catch (e) {
      console.error(e)
      notify(t("errors.generic"), "error")
    }

    setEquipping(false)
  }

  const ownedItemIds = new Set(inventory.map(i => i.id))
  const getInventoryItem = (itemId) => inventory.find(i => i.id === itemId)
  const isEquipped = (itemId) => getInventoryItem(itemId)?.equipped_slot != null

  const featuredCollections = collections.filter(c => c.is_featured)
  const regularCollections = collections.filter(c => !c.is_featured)

  if (loading) {
    return (
      <div className="py-12">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-white">{t("title")}</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 rounded-md">
            Beta
          </span>
        </div>
        <p className="text-sm text-zinc-500">{t("subtitle")}</p>
      </div>

      {!activeCollection && <ArtistCredits />}
      {!activeCollection && <ArtistsCarousel />}

      {activeCollection ? (
        collectionLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : (
          <CollectionFullView
            collection={{ ...activeCollection, items: activeCollectionItems }}
            ownedItemIds={ownedItemIds}
            isEquipped={isEquipped}
            onSelectItem={setSelectedItem}
            onBack={handleBackFromCollection}
          />
        )
      ) : (
        <>
          {featuredCollections.length > 0 && (
            <div className={`mb-10 ${featuredCollections.length > 1 ? "space-y-3" : ""}`}>
              {featuredCollections.map(col => (
                <FeaturedBanner
                  key={col.id}
                  collection={col}
                  onClick={handleViewAll}
                />
              ))}
            </div>
          )}

          {regularCollections.map(col => (
            <CollectionSection
              key={col.id}
              collection={col}
              ownedItemIds={ownedItemIds}
              isEquipped={isEquipped}
              onSelectItem={setSelectedItem}
              onViewAll={handleViewAll}
            />
          ))}

          {collections.length === 0 && <EmptyState />}
        </>
      )}

      <ItemDetailModal
        item={selectedItem}
        owned={selectedItem ? ownedItemIds.has(selectedItem.id) : false}
        equipped={selectedItem ? isEquipped(selectedItem.id) : false}
        onClose={() => setSelectedItem(null)}
        onPurchase={handlePurchase}
        onEquip={() => {
          const invItem = getInventoryItem(selectedItem.id)
          if (invItem) handleEquip(invItem.inventory_id, selectedItem.item_type)
        }}
        purchasing={purchasing}
        equipping={equipping}
        user={user}
      />

      <PurchaseSuccessModal
        isOpen={!!purchasedItem}
        onClose={() => setPurchasedItem(null)}
        item={purchasedItem}
      />
    </div>
  )
}

