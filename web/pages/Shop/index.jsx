import { useState, useEffect, useCallback } from "react"
import { Loader2, Settings } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { notify } from "@components/UI/Notification"
import { getAuthHeaders } from "./utils/shopHelpers"
import ArtistsCarousel from "./components/ArtistsCarousel"
import ArtistCredits from "./components/ArtistCredits"
import CollectionSection from "./components/CollectionSection"
import CollectionFullView from "./components/CollectionFullView"
import FeaturedBanner from "./components/FeaturedBanner"
import EmptyState from "./components/EmptyState"
import ItemDetailModal from "./components/ItemDetailModal"
import PurchaseSuccessModal from "./components/PurchaseSuccessModal"
import GiftSuccessModal from "./components/GiftSuccessModal"
import AdminPanel from "./components/AdminPanel"

export default function ShopPage() {
  const { user, updateUser } = useAuth()
  const { t } = useTranslation("shop")

  const [collections, setCollections] = useState([])
  const [artists, setArtists] = useState([])
  const [inventory, setInventory] = useState([])

  const [loading, setLoading] = useState(true)
  const [activeCollection, setActiveCollection] = useState(null)
  const [activeCollectionItems, setActiveCollectionItems] = useState([])
  const [collectionLoading, setCollectionLoading] = useState(false)

  const [selectedItem, setSelectedItem] = useState(null)
  const [purchasing, setPurchasing] = useState(false)
  const [equipping, setEquipping] = useState(false)
  const [gifting, setGifting] = useState(false)
  const [purchasedItem, setPurchasedItem] = useState(null)
  const [giftedData, setGiftedData] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)

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

  const loadShopData = useCallback(async () => {
    try {
      const [collectionsRes, artistsRes] = await Promise.all([
        fetch("/api/shop/collections"),
        fetch("/api/shop/artists"),
      ])

      const collectionsData = await collectionsRes.json()
      const artistsData = await artistsRes.json()

      setCollections(collectionsData?.collections || [])
      setArtists(artistsData?.artists || [])
    } catch (e) {
      console.error("Failed to load shop data:", e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadShopData() }, [loadShopData])

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

      if (data.minerals) {
        updateUser({ user_minerals: [data.minerals] })
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

  async function handleGift(item, recipientId) {
    const headers = await getAuthHeaders()
    if (!headers) {
      notify(t("errors.loginRequired"), "error")
      return
    }

    setGifting(true)

    try {
      const res = await fetch("/api/shop/@me/gift", {
        method: "POST",
        headers,
        body: JSON.stringify({ itemId: item.id, recipientId }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorKey = data.error || "generic"
        const errorMessages = {
          cannot_gift_yourself: t("gift.errors.cannotGiftYourself"),
          recipient_not_found: t("gift.errors.recipientNotFound"),
          item_not_found: t("gift.errors.itemNotFound"),
          recipient_already_owns: t("gift.errors.recipientAlreadyOwns"),
          insufficient_minerals: t("gift.errors.insufficientMinerals"),
          no_minerals: t("gift.errors.noMinerals"),
          out_of_stock: t("gift.errors.outOfStock"),
          item_expired: t("gift.errors.itemExpired"),
          item_not_yet_available: t("gift.errors.itemNotYetAvailable"),
        }
        notify(errorMessages[errorKey] || t("gift.errors.failed"), "error")
        setGifting(false)
        return
      }

      if (data.minerals) {
        updateUser({ user_minerals: [data.minerals] })
      }

      setSelectedItem(null)
      setTimeout(() => {
        setGiftedData({
          item: data.item,
          recipient: data.recipient,
        })
      }, 150)
    } catch (e) {
      console.error(e)
      notify(t("errors.generic"), "error")
    }

    setGifting(false)
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

  function handleAdminClose() {
    setAdminOpen(false)
    loadShopData()
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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{t("title")}</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 rounded-md">
                Beta
              </span>
            </div>
            <p className="text-sm text-zinc-500">{t("subtitle")}</p>
          </div>

          {user?.is_moderator && (
            <button
              onClick={() => setAdminOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              {t("admin.manage")}
            </button>
          )}
        </div>
      </div>

      {!activeCollection && <ArtistCredits />}
      {!activeCollection && <ArtistsCarousel artists={artists} />}

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
        onGift={handleGift}
        onEquip={() => {
          const invItem = getInventoryItem(selectedItem.id)
          if (invItem) handleEquip(invItem.inventory_id, selectedItem.item_type)
        }}
        purchasing={purchasing}
        equipping={equipping}
        gifting={gifting}
        user={user}
      />

      <PurchaseSuccessModal
        isOpen={!!purchasedItem}
        onClose={() => setPurchasedItem(null)}
        item={purchasedItem}
      />

      <GiftSuccessModal
        isOpen={!!giftedData}
        onClose={() => setGiftedData(null)}
        data={giftedData}
      />

      {user?.is_moderator && (
        <AdminPanel isOpen={adminOpen} onClose={handleAdminClose} />
      )}
    </div>
  )
}
