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

const ITEM_TYPE_ICONS = {
  avatar_decoration: Star,
  banner: Image,
  profile_effect: Sparkles,
  badge: Award,
  name_color: Palette,
  theme: Monitor,
}

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

function ItemCard({ item, owned, onSelect }) {
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
            ✦ {t("tags.featured", "Featured")}
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
            {t("tags.soldOut", "Sold Out")}
          </span>
        )}
        <TimeBadge availableUntil={item.available_until} />
        {owned && (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full backdrop-blur-sm flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            {t("tags.owned", "Owned")}
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
        <PriceDisplay item={item} size="sm" />
      </div>
    </button>
  )
}

function CollectionBanner({ collection, onClick }) {
  const { t } = useTranslation("shop")

  return (
    <button
      onClick={() => onClick(collection)}
      className="relative w-full overflow-hidden rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all cursor-pointer group text-left"
    >
      {collection.banner_url ? (
        <div className="relative h-44 sm:h-52 overflow-hidden">
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
          className="h-44 sm:h-52"
          style={{
            background: collection.accent_color
              ? `linear-gradient(135deg, ${collection.accent_color}22, ${collection.accent_color}08, transparent)`
              : "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04), transparent)",
          }}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70 rounded-full backdrop-blur-sm mb-3">
              <Sparkles className="w-3 h-3" />
              {t("collection.label", "Collection")}
            </span>
            <h2 className="text-lg font-bold text-white mb-0.5">{collection.name}</h2>
            {collection.description && (
              <p className="text-sm text-zinc-400 line-clamp-1">{collection.description}</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0 mb-1" />
        </div>
      </div>
    </button>
  )
}

function CollectionHeader({ collection, onBack }) {
  const { t } = useTranslation("shop")

  return (
    <div className="mb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("collection.back", "Back to shop")}
      </button>

      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-800/50 p-6"
        style={{
          background: collection.accent_color
            ? `linear-gradient(135deg, ${collection.accent_color}15, transparent)`
            : "linear-gradient(135deg, rgba(139,92,246,0.08), transparent)",
        }}
      >
        {collection.banner_url && (
          <img
            src={collection.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-10 select-none"
            draggable={false}
          />
        )}
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/70 rounded-full mb-3">
            <Sparkles className="w-3 h-3" />
            {t("collection.label", "Collection")}
          </span>
          <h2 className="text-xl font-bold text-white mb-1">{collection.name}</h2>
          {collection.description && (
            <p className="text-sm text-zinc-400">{collection.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation("shop")

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center mb-4">
        <Package className="w-7 h-7 text-zinc-600" />
      </div>
      <h3 className="text-sm font-medium text-zinc-400 mb-1">
        {t("empty.title", "No items found")}
      </h3>
      <p className="text-xs text-zinc-600">
        {t("empty.description", "Try adjusting your filters")}
      </p>
    </div>
  )
}

function ItemDetailModal({ item, owned, onClose, onPurchase, purchasing, user }) {
  const { t } = useTranslation("shop")

  if (!item) return null

  const isSoldOut = item.is_limited && item.current_stock === 0
  const hasPrice = MINERALS.some(m => (item[`price_${m.key}`] || 0) > 0)

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
          {item.asset_url ? (
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
                ✦ {t("tags.featured", "Featured")}
              </span>
            )}
            {item.is_limited && (
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full backdrop-blur-sm">
                {t("tags.limited", "Limited")}
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

          {item.is_limited && item.max_stock != null && (
            <div className="flex items-center gap-2 mb-5 text-sm text-zinc-400">
              <Package className="w-4 h-4 text-zinc-500" />
              <span>
                {isSoldOut
                  ? t("detail.soldOutLabel", "Sold out")
                  : `${item.current_stock} / ${item.max_stock} ${t("detail.remaining", "remaining")}`
                }
              </span>
            </div>
          )}

          {item.available_until && (
            <div className="flex items-center gap-2 mb-5 text-sm text-zinc-400">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>
                {t("detail.availableUntil", "Available until")} {new Date(item.available_until).toLocaleDateString()}
              </span>
            </div>
          )}

          {hasPrice && (
            <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800 mb-6">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2.5 block">
                {t("detail.price", "Price")}
              </span>
              <PriceDisplay item={item} size="lg" />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all cursor-pointer"
            >
              {t("detail.close", "Close")}
            </button>

            {owned ? (
              <div className="flex-1 px-4 py-3 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                {t("detail.owned", "Owned")}
              </div>
            ) : isSoldOut ? (
              <div className="flex-1 px-4 py-3 text-sm font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-center">
                {t("detail.soldOut", "Sold Out")}
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
                    {t("detail.purchase", "Purchase")}
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 px-4 py-3 text-sm font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-center text-center">
                {t("detail.loginRequired", "Log in to purchase")}
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
          <h3 className="text-lg font-semibold text-white mb-2">
            {t("success.title", "Purchase Complete!")}
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            <span className="text-zinc-300 font-medium">{item?.name}</span>{" "}
            {t("success.description", "has been added to your inventory.")}
          </p>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
          >
            {t("success.continue", "Continue Shopping")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function ShopPage() {
  const { user } = useAuth()
  const { t } = useTranslation("shop")

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [collections, setCollections] = useState([])
  const [inventory, setInventory] = useState([])

  const [initialLoading, setInitialLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(true)

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedType, setSelectedType] = useState(null)

  const [activeCollection, setActiveCollection] = useState(null)
  const [collectionItems, setCollectionItems] = useState([])

  const [selectedItem, setSelectedItem] = useState(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchasedItem, setPurchasedItem] = useState(null)

  usePageMeta({
    title: t("meta.title", "Shop"),
    description: t("meta.description", "Browse and purchase items"),
  })

  const fetchInventory = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) return []
    try {
      const res = await fetch("/api/shop/@me/inventory", { headers })
      const data = await res.json()
      return data.inventory || []
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [catRes, colRes] = await Promise.all([
          fetch("/api/shop/categories").then(r => r.json()),
          fetch("/api/shop/collections").then(r => r.json()),
        ])
        setCategories(catRes?.categories || [])
        setCollections(colRes?.collections || [])
      } catch (e) {
        console.error("Failed to load shop data:", e)
      }
      setInitialLoading(false)
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

  useEffect(() => {
    if (activeCollection) return

    async function load() {
      setItemsLoading(true)
      const params = new URLSearchParams({ limit: "60" })
      if (selectedCategory) params.set("category", selectedCategory)
      if (selectedType) params.set("type", selectedType)

      try {
        const res = await fetch(`/api/shop/items?${params}`)
        const data = await res.json()
        setItems(data?.items || [])
      } catch (e) {
        console.error("Failed to fetch items:", e)
      }
      setItemsLoading(false)
    }
    load()
  }, [selectedCategory, selectedType, activeCollection])

  async function handleCollectionClick(collection) {
    setActiveCollection(collection)
    setItemsLoading(true)

    try {
      const res = await fetch(`/api/shop/collections?slug=${collection.slug}`)
      const data = await res.json()
      const col = data?.collections?.[0] || data?.collection
      setCollectionItems(col?.items || [])
    } catch (e) {
      console.error("Failed to fetch collection:", e)
      setCollectionItems([])
    }
    setItemsLoading(false)
  }

  function handleBackFromCollection() {
    setActiveCollection(null)
    setCollectionItems([])
  }

  async function handlePurchase(item) {
    const headers = await getAuthHeaders()
    if (!headers) {
      notify(t("errors.loginRequired", "You need to be logged in"), "error")
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
        notify(data.error || t("errors.purchaseFailed", "Purchase failed"), "error")
        setPurchasing(false)
        return
      }

      const inv = await fetchInventory()
      setInventory(inv)

      setSelectedItem(null)
      setTimeout(() => setPurchasedItem(item), 150)
    } catch (e) {
      console.error(e)
      notify(t("errors.generic", "Something went wrong"), "error")
    }

    setPurchasing(false)
  }

  const ownedItemIds = new Set(inventory.map(i => i.item_id))
  const displayItems = activeCollection ? collectionItems : items
  const featuredCollections = collections.filter(c => c.is_featured)
  const visibleTypes = [...new Set(items.map(i => i.item_type))].filter(Boolean)

  if (initialLoading) {
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
        <h1 className="text-2xl font-bold text-white mb-2">{t("title", "Shop")}</h1>
        <p className="text-sm text-zinc-500">
          {t("subtitle", "Browse and customize your profile with unique items")}
        </p>
      </div>

      {activeCollection ? (
        <>
          <CollectionHeader
            collection={activeCollection}
            onBack={handleBackFromCollection}
          />

          {itemsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
            </div>
          ) : collectionItems.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {collectionItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={ownedItemIds.has(item.id)}
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {featuredCollections.length > 0 && (
            <div className={`mb-8 ${featuredCollections.length > 1 ? "space-y-4" : ""}`}>
              {featuredCollections.map(col => (
                <CollectionBanner
                  key={col.id}
                  collection={col}
                  onClick={handleCollectionClick}
                />
              ))}
            </div>
          )}

          {categories.length > 0 && (
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setSelectedType(null)
                }}
                className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  !selectedCategory
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {t("filters.all", "All")}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.slug)
                    setSelectedType(null)
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.slug
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {visibleTypes.length > 1 && (
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedType(null)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer border ${
                  !selectedType
                    ? "bg-zinc-700/60 text-white border-zinc-600"
                    : "bg-transparent text-zinc-500 hover:text-zinc-300 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {t("filters.allTypes", "All types")}
              </button>
              {visibleTypes.map(type => {
                const Icon = ITEM_TYPE_ICONS[type] || Package
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer border ${
                      selectedType === type
                        ? "bg-zinc-700/60 text-white border-zinc-600"
                        : "bg-transparent text-zinc-500 hover:text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {t(`types.${type}`, type.replace(/_/g, " "))}
                  </button>
                )
              })}
            </div>
          )}

          {itemsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
            </div>
          ) : displayItems.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={ownedItemIds.has(item.id)}
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ItemDetailModal
        item={selectedItem}
        owned={selectedItem ? ownedItemIds.has(selectedItem.id) : false}
        onClose={() => setSelectedItem(null)}
        onPurchase={handlePurchase}
        purchasing={purchasing}
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