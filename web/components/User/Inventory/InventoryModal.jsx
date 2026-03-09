import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Check, X } from "lucide-react"
import Modal from "@components/UI/Modal"
import { supabase } from "#lib/supabase.js"
import { notify } from "@components/UI/Notification"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"

const SLOTS = [
  "avatar_decoration",
  "profile_effect",
  "banner",
  "badge",
  "name_color",
  "theme",
]

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

function NoneCard({ active, onClick, loading }) {
  const { t } = useTranslation("inventory")

  return (
    <button
      onClick={onClick}
      disabled={loading || active}
      className={`group w-full text-left rounded-xl overflow-hidden border transition-all duration-200 ${
        active
          ? "border-violet-500/30 bg-violet-500/8"
          : "border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-zinc-700 cursor-pointer"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""} ${active ? "cursor-default" : ""}`}
    >
      <div className="aspect-square flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
        ) : (
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-zinc-600 transition-colors flex items-center justify-center">
            <X className="w-4 h-4 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">{t("none")}</span>
          {active && <Check className="w-3 h-3 text-violet-400" />}
        </div>
      </div>
    </button>
  )
}

function InventoryItemCard({ entry, active, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || active}
      className={`group w-full text-left rounded-xl overflow-hidden border transition-all duration-200 ${
        active
          ? "border-violet-500/30 bg-violet-500/8"
          : "border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-zinc-700 cursor-pointer"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""} ${active ? "cursor-default" : ""}`}
    >
      <div className="aspect-square bg-gradient-to-b from-zinc-800/10 to-zinc-900/20 flex items-center justify-center p-5 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 z-10">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        )}
        {entry.asset_url ? (
          <img
            src={entry.asset_url}
            alt={entry.name}
            className="w-full h-full object-contain select-none group-hover:scale-105 transition-transform duration-300"
            draggable={false}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-zinc-800/60" />
        )}
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-medium text-zinc-300 truncate">{entry.name}</h4>
          {active && <Check className="w-3 h-3 text-violet-400 flex-shrink-0" />}
        </div>
      </div>
    </button>
  )
}

function SlotSection({ slot, items, equippedInventoryId, onEquip, onUnequip, loadingId }) {
  const { t } = useTranslation("inventory")

  return (
    <section className="mb-8 last:mb-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">
          {t(`slots.${slot}.title`)}
        </h3>
        <p className="text-xs text-zinc-600 mt-0.5">
          {t(`slots.${slot}.description`)}
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
        <NoneCard
          active={!equippedInventoryId}
          loading={loadingId === `none:${slot}`}
          onClick={() => onUnequip(slot)}
        />

        {items.map(entry => (
          <InventoryItemCard
            key={entry.inventory_id}
            entry={entry}
            active={equippedInventoryId === entry.inventory_id}
            loading={loadingId === entry.inventory_id}
            onClick={() => onEquip(entry.inventory_id, slot)}
          />
        ))}
      </div>
    </section>
  )
}

function ProfilePreview({ user, equippedDecoration, itemCount, equippedCount }) {
  const { t } = useTranslation("inventory")

  return (
    <div className="flex items-center gap-4">
      <AvatarWithDecoration
        src={user.avatar}
        alt={user.username}
        size="lg"
        showStatus={false}
        decorationUrl={equippedDecoration}
      />
      <div>
        <p className="text-sm font-semibold text-white">{user.username}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {itemCount} {itemCount === 1 ? t("itemCount") : t("itemsCount")}
          {equippedCount > 0 && (
            <span className="text-zinc-600"> · {equippedCount} {t("equippedCount")}</span>
          )}
        </p>
      </div>
    </div>
  )
}

function buildEquippedMap(items) {
  const equipped = {}
  for (const entry of items) {
    if (entry.equipped_slot) {
      equipped[entry.equipped_slot] = entry.asset_url || null
    }
  }
  return equipped
}

export default function InventoryModal({ isOpen, onClose }) {
  const { t } = useTranslation("inventory")
  const { user, updateUser } = useAuth()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState(null)
  const hasFetched = useRef(false)

  const syncUserCosmetics = useCallback((items) => {
    const equipped = buildEquippedMap(items)
    updateUser({
      avatar_decoration: equipped.avatar_decoration || null,
      profile_effect: equipped.profile_effect || null,
      banner: equipped.banner || null,
      badge: equipped.badge || null,
      name_color: equipped.name_color || null,
      theme: equipped.theme || null,
    })
  }, [updateUser])

  const fetchInventory = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    setLoading(true)

    try {
      const res = await fetch("/api/shop/@me/inventory", { headers })
      const data = await res.json()
      const items = data.items || []
      setInventory(items)
      syncUserCosmetics(items)
    } catch {
      notify(t("errors.loadFailed"), "error")
    }

    setLoading(false)
  }, [t, syncUserCosmetics])

  useEffect(() => {
    if (!isOpen || !user) {
      hasFetched.current = false
      return
    }

    if (hasFetched.current) return

    hasFetched.current = true
    fetchInventory()
  }, [isOpen, user, fetchInventory])

  const grouped = useMemo(() => {
    const groups = {}
    for (const s of SLOTS) groups[s] = []

    for (const entry of inventory) {
      const type = entry.item_type
      if (!groups[type]) groups[type] = []
      groups[type].push(entry)
    }

    return groups
  }, [inventory])

  const equippedBySlot = useMemo(() => {
    const equipped = {}
    for (const entry of inventory) {
      if (entry.equipped_slot) {
        equipped[entry.equipped_slot] = entry.inventory_id
      }
    }
    return equipped
  }, [inventory])

  const slotsWithItems = useMemo(() => {
    return SLOTS.filter(s => (grouped[s] || []).length > 0)
  }, [grouped])

  const equippedDecoration = useMemo(() => {
    return inventory.find(
      e => e.equipped_slot === "avatar_decoration" && e.item_type === "avatar_decoration"
    )?.asset_url || null
  }, [inventory])

  const equippedCount = useMemo(() => {
    return inventory.filter(e => e.equipped_slot).length
  }, [inventory])

  async function handleEquip(inventoryId, slot) {
    const headers = await getAuthHeaders()
    if (!headers) {
      notify(t("errors.loginRequired"), "error")
      return
    }

    setActionId(inventoryId)

    try {
      const res = await fetch("/api/shop/@me/equip", {
        method: "POST",
        headers,
        body: JSON.stringify({ inventoryId, slot }),
      })

      const data = await res.json()

      if (!res.ok) {
        notify(data.error || t("errors.equipFailed"), "error")
        setActionId(null)
        return
      }

      const updatedItems = inventory.map(entry => ({
        ...entry,
        equipped_slot:
          entry.item_type === slot
            ? entry.inventory_id === inventoryId
              ? slot
              : null
            : entry.equipped_slot,
      }))

      setInventory(updatedItems)
      syncUserCosmetics(updatedItems)

      notify(t("success.equipped"), "success")
    } catch {
      notify(t("errors.equipFailed"), "error")
    }

    setActionId(null)
  }

  async function handleUnequip(slot) {
    const headers = await getAuthHeaders()
    if (!headers) {
      notify(t("errors.loginRequired"), "error")
      return
    }

    setActionId(`none:${slot}`)

    try {
      const res = await fetch("/api/shop/@me/unequip", {
        method: "POST",
        headers,
        body: JSON.stringify({ slot }),
      })

      const data = await res.json()

      if (!res.ok) {
        notify(data.error || t("errors.unequipFailed"), "error")
        setActionId(null)
        return
      }

      const updatedItems = inventory.map(entry => ({
        ...entry,
        equipped_slot:
          entry.equipped_slot === slot ? null : entry.equipped_slot,
      }))

      setInventory(updatedItems)
      syncUserCosmetics(updatedItems)

      notify(t("success.unequipped"), "success")
    } catch {
      notify(t("errors.unequipFailed"), "error")
    }

    setActionId(null)
  }

  if (!user) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="border-b border-zinc-800 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t("description")}</p>
            </div>
            <div className="hidden sm:block">
              <ProfilePreview
                user={user}
                equippedDecoration={equippedDecoration}
                itemCount={inventory.length}
                equippedCount={equippedCount}
              />
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
            </div>
          ) : slotsWithItems.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-800/50 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-zinc-400 mb-1">
                {t("empty.title")}
              </h3>
              <p className="text-xs text-zinc-600">
                {t("empty.description")}
              </p>
            </div>
          ) : (
            slotsWithItems.map(slot => (
              <SlotSection
                key={slot}
                slot={slot}
                items={grouped[slot] || []}
                equippedInventoryId={equippedBySlot[slot] || null}
                loadingId={actionId}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            ))
          )}
        </div>

        <div className="border-t border-zinc-800 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all cursor-pointer"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
