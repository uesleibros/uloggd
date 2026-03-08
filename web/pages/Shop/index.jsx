import { useState, useEffect, useCallback } from "react"
import { supabase } from "#lib/supabase.js"
import {
  Loader2, ShoppingBag, Check, ChevronRight,
  Sparkles, Clock, Package, Star,
  Palette, Image, Award, Monitor,
  CheckCircle, ArrowLeft
} from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { useAuth } from "#hooks/useAuth"
import { notify } from "@components/UI/Notification"
import { MINERALS } from "@components/Minerals/MineralRow"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"

const ITEM_TYPE_ICONS = {
  avatar_decoration: Star,
  banner: Image,
  profile_effect: Sparkles,
  badge: Award,
  name_color: Palette,
  theme: Monitor,
}

const ITEMS_PREVIEW_COUNT = 4

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

function PriceDisplay({ item, size = "md" }) {
  const prices = MINERALS
    .filter(m => (item[`price_${m.key}`] || 0) > 0)
    .map(m => ({ ...m, amount: item[`price_${m.key}`] }))

  if (prices.length === 0) {
    return <span className="text-xs text-emerald-400 font-medium">Free</span>
  }

  const s = {
    sm: { box: "w-2 h-2", text: "text-xs", gap: "gap-1" },
    md: { box: "w-2.5 h-2.5", text: "text-sm", gap: "gap-1.5" },
    lg: { box: "w-3 h-3", text: "text-sm", gap: "gap-2" },
  }[size] || { box: "w-2.5 h-2.5", text: "text-sm", gap: "gap-1.5" }

  return (
    <div className="flex items-center flex-wrap gap-2">
      {prices.map((p, i) => (
        <div key={p.key} className={`flex items-center ${s.gap}`}>
          {i > 0 && <span className="text-zinc-600 text-xs">+</span>}
          <span
            className={`inline-block ${s.box} rounded-sm flex-shrink-0`}
            style={{ backgroundColor: p.color }}
          />
          <span
            className={`${s.text} font-semibold tabular-nums`}
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
  const label = days > 0 ? `${days}d` : hours > 0 ? `${hours}h` : "Soon"

  return (
    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full flex items-center gap-1">
      <Clock className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}

function AvatarDecorationPreview({ item, user }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <AvatarWithDecoration
        src={user.avatar}
        alt={user.username}
        decorationUrl={item.asset_url}
        size="profile"
        showStatus={false}
      />
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
        Preview
      </span>
    </div>
  )
}

function ItemCard({ item, owned, equipped, onSelect }) {
  const { t } = useTranslation("shop")
  const isSoldOut = item.is_limited && item.current_stock === 0

  return (
    <button
      onClick={() => onSelect(item)}
      className={`group relative w-full text-left rounded-2xl overflow-hidden transition-all cursor-pointer ${
        isSoldOut
          ? "bg-zinc-800/20 border border-zinc-800/30 opacity-50"
          : "bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700/50"
      }`}
    >
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
        {item.is_featured && (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-full backdrop-blur-sm">
            ✦ {t("tags.featured")}
          </span>
        )}
        {item.is_limited && !isSoldOut && item.max_stock != null && (
          <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full backdrop-blur-sm ${
            item.current_stock / item.max_stock <= 0.2
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          }`}>
            {item.current_stock}/{item.max_stock}
          </span>
        )}
        {isSoldOut && (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-zinc-700/50 text-zinc-400 rounded-full backdrop-blur-sm">
            {t("tags.soldOut")}
          </span>
        )}
        <TimeBadge availableUntil={item.available_until} />
        {equipped && (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full backdrop-blur-sm flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            {t("tags.equipped")}
          </span>
        )}
        {owned && !equipped && (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-zinc-700/50 text-zinc-300 rounded-full backdrop-blur-sm flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            {t("tags.owned")}
          </span>
        )}
      </div>

      <div className="aspect-square bg-gradient-to-b from-zinc-800/20 to-zinc-900/20 flex items-center justify-center p-8">
        {item.asset_url ? (
          <img
            src={item.asset_url}
            alt={item.name}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 select-none"
            draggable={false}
          />
        ) : (
          <Package className="w-12 h-12 text-zinc-700" />
        )}
      </div>

      <div className="p-4 border-t border-zinc-800/30">
        <div className="flex items-center gap-1.5 mb-1.5">
          {(() => {
            const Icon = ITEM_TYPE_ICONS[item.item_type] || Package
            return <Icon className="w-3 h-3 text-zinc-600" />
          })()}
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
            {t(`types.${item.item_type}`, item.item_type?.replace(/_/g, " "))}
          </span>
        </div>
        <h3 className="text-sm font-medium text-white truncate mb-2.5">{item.name}</h3>
        {!owned && <PriceDisplay item={item} size="sm" />}
        {owned && !equipped && (
          <span className="text-xs text-zinc-500">{t("card.ownedHint")}</span>
        )}
        {equipped && (
          <span className="text-xs text-emerald-400">{t("card.equippedHint")}</span>
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
    <section className="mb-12 last:mb-0">
      {collection.banner_url ? (
        <button
          onClick={() => onViewAll(collection)}
          className="relative w-full overflow-hidden rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all cursor-pointer group text-left mb-6"
        >
          <div className="relative h-40 sm:h-48 overflow-hidden">
            <img
              src={collection.banner_url}
              alt={collection.name}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 select-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                {collection.is_featured && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70 rounded-full backdrop-blur-sm mb-3">
                    <Sparkles className="w-3 h-3" />
                    {t("collection.label")}
                  </span>
                )}
                <h2 className="text-lg font-bold text-white mb-0.5">{collection.name}</h2>
                {collection.description && (
                  <p className="text-sm text-zinc-400 line-clamp-1">{collection.description}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0 mb-1" />
            </div>
          </div>
        </button>
      ) : (
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              {collection.accent_color ? (
                <span
                  className="w-1 h-5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: collection.accent_color }}
                />
              ) : (
                <span className="w-1 h-5 rounded-full bg-violet-500 flex-shrink-0" />
              )}
              <h2 className="text-lg font-semibold text-white">{collection.name}</h2>
              {collection.available_until && <TimeBadge availableUntil={collection.available_until} />}
            </div>
            {collection.description && (
              <p className="text-sm text-zinc-500 ml-3.5">{collection.description}</p>
            )}
          </div>

          {hasMore && (
            <button
              onClick={() => onViewAll(collection)}
              className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              {t("collection.viewAll")}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {previewItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => onViewAll(collection)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all cursor-pointer"
          >
            {t("collection.viewAll")}
            <span className="text-zinc-600">({items.length})</span>
            <ChevronRight className="w-4 h-4" />
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
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("collection.back")}
      </button>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/50 mb-8">
        {collection.banner_url ? (
          <div className="relative h-44 sm:h-56 overflow-hidden">
            <img
              src={collection.banner_url}
              alt=""
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70 rounded-full backdrop-blur-sm mb-3">
                <Sparkles className="w-3 h-3" />
                {t("collection.label")}
              </span>
              <h2 className="text-xl font-bold text-white mb-1">{collection.name}</h2>
              {collection.description && (
                <p className="text-sm text-zinc-400">{collection.description}</p>
              )}
              {collection.available_until && (
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  {t("detail.availableUntil")} {new Date(collection.available_until).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="p-6"
            style={{
              background: collection.accent_color
                ? `linear-gradient(135deg, ${collection.accent_color}15, transparent)`
                : "linear-gradient(135deg, rgba(139,92,246,0.08), transparent)",
            }}
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70 rounded-full mb-3">
              <Sparkles className="w-3 h-3" />
              {t("collection.label")}
            </span>
            <h2 className="text-xl font-bold text-white mb-1">{collection.name}</h2>
            {collection.description && (
              <p className="text-sm text-zinc-400">{collection.description}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-zinc-500">
          {items.length} {items.length === 1 ? t("collection.itemCount") : t("collection.itemsCount")}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
      className="relative w-full overflow-hidden rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all cursor-pointer group text-left"
    >
      {collection.banner_url ? (
        <div className="relative h-48 sm:h-60 overflow-hidden">
          <img
            src={collection.banner_url}
            alt={collection.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 select-none"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />
        </div>
      ) : (
        <div
          className="h-48 sm:h-60"
          style={{
            background: collection.accent_color
              ? `linear-gradient(135deg, ${collection.accent_color}22, ${collection.accent_color}08, transparent)`
              : "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04), transparent)",
          }}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70 rounded-full backdrop-blur-sm mb-3">
              <Sparkles className="w-3 h-3" />
              {t("collection.featured")}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{collection.name}</h2>
            {collection.description && (
              <p className="text-sm text-zinc-300 line-clamp-2 max-w-lg">{collection.description}</p>
            )}
            {collection.available_until && (
              <div className="flex items-center gap-1.5 mt-2">
                <TimeBadge availableUntil={collection.available_until} />
              </div>
            )}
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  )
}

function EmptyState() {
  const { t } = useTranslation("shop")

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center mb-4">
        <Package className="w-7 h-7 text-zinc-600" />
      </div>
      <h3 className="text-sm font-medium text-zinc-400 mb-1">{t("empty.title")}</h3>
      <p className="text-xs text-zinc-600">{t("empty.description")}</p>
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
      maxWidth="max-w-lg"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="relative aspect-[16/10] bg-gradient-to-b from-zinc-800/40 to-zinc-900 flex items-center justify-center p-12">
          {isAvatarDecoration && item.asset_url ? (
            <AvatarDecorationPreview item={item} user={user} />
          ) : item.asset_url ? (
            <img
              src={item.asset_url}
              alt={item.name}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          ) : (
            <Package className="w-20 h-20 text-zinc-700" />
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            {item.is_featured && (
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-full backdrop-blur-sm">
                ✦ {t("tags.featured")}
              </span>
            )}
            {item.is_limited && (
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full backdrop-blur-sm">
                {t("tags.limited")}
              </span>
            )}
            {owned && (
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full backdrop-blur-sm flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                {t("tags.owned")}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const Icon = ITEM_TYPE_ICONS[item.item_type] || Package
              return <Icon className="w-4 h-4 text-zinc-500" />
            })()}
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              {t(`types.${item.item_type}`, item.item_type?.replace(/_/g, " "))}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">{item.name}</h2>

          {item.description && (
            <p className="text-sm text-zinc-400 leading-relaxed mb-5">{item.description}</p>
          )}

          {item.is_limited && item.max_stock != null && !owned && (
            <div className="flex items-center gap-2 mb-5 text-sm text-zinc-400">
              <Package className="w-4 h-4 text-zinc-500" />
              <span>
                {isSoldOut
                  ? t("detail.soldOutLabel")
                  : `${item.current_stock} / ${item.max_stock} ${t("detail.remaining")}`}
              </span>
            </div>
          )}

          {item.available_until && !owned && (
            <div className="flex items-center gap-2 mb-5 text-sm text-zinc-400">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>
                {t("detail.availableUntil")} {new Date(item.available_until).toLocaleDateString()}
              </span>
            </div>
          )}

          {!owned && hasPrice && (
            <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800 mb-6">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2.5 block">
                {t("detail.price")}
              </span>
              <PriceDisplay item={item} size="lg" />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all cursor-pointer"
            >
              {t("detail.close")}
            </button>

            {owned ? (
              equipped ? (
                <div className="flex-1 px-4 py-3 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  {t("detail.equipped")}
                </div>
              ) : (
                <button
                  onClick={onEquip}
                  disabled={equipping}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {equipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t("detail.equip")}
                    </>
                  )}
                </button>
              )
            ) : isSoldOut ? (
              <div className="flex-1 px-4 py-3 text-sm font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-center">
                {t("detail.soldOut")}
              </div>
            ) : user ? (
              <button
                onClick={() => onPurchase(item)}
                disabled={purchasing}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    {t("detail.purchase")}
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 px-4 py-3 text-sm font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-center text-center">
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
      <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t("success.title")}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            <span className="text-zinc-300 font-medium">{item?.name}</span>{" "}
            {t("success.description")}
          </p>
        </div>
        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">{t("title")}</h1>
        <p className="text-sm text-zinc-500">{t("subtitle")}</p>
      </div>

      {activeCollection ? (
        collectionLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
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
            <div className={`mb-12 ${featuredCollections.length > 1 ? "space-y-4" : ""}`}>
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


