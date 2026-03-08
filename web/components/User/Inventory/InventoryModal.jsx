import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Check } from "lucide-react"
import Modal from "@components/UI/Modal"
import { supabase } from "#lib/supabase.js"
import { notify } from "@components/UI/Notification"
import { useTranslation } from "#hooks/useTranslation"
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

function EmptyEquipCard({ label, active, onClick, loading }) {
  const { t } = useTranslation("inventory")

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full text-left rounded-xl border transition-all px-4 py-3 cursor-pointer ${
        active
          ? "border-violet-500/40 bg-violet-500/10"
          : "border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800/70 hover:border-zinc-700"
      } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
            {t("unequip")}
          </span>
          <p className="text-sm font-medium text-zinc-300 mt-0.5">{label}</p>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
        ) : active ? (
          <Check className="w-4 h-4 text-violet-400" />
        ) : null}
      </div>
    </button>
  )
}

function InventoryItemCard({ item, active, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`group w-full text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
        active
          ? "border-violet-500/40 bg-violet-500/10"
          : "border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800/70 hover:border-zinc-700"
      } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className="aspect-square bg-gradient-to-b from-zinc-800/10 to-zinc-900/30 flex items-center justify-center p-5">
        {item.item?.asset_url ? (
          <img
            src={item.item.asset_url}
            alt={item.item.name}
            className="w-full h-full object-contain select-none group-hover:scale-105 transition-transform duration-300"
            draggable={false}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-zinc-800/60" />
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-white truncate">{item.item?.name}</h4>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 flex-shrink-0" />
          ) : active ? (
            <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          ) : null}
        </div>
      </div>
    </button>
  )
}

function SlotSection({ slot, items, equippedInventoryId, onEquip, loadingId }) {
  const { t } = useTranslation("inventory")

  return (
    <section className="mb-8 last:mb-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">
          {t(`slots.${slot}.title`)}
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {t(`slots.${slot}.description`)}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <EmptyEquipCard
          label={t("noneEquipped")}
          active={!equippedInventoryId}
          loading={loadingId === `none:${slot}`}
          onClick={() => onEquip(null, slot)}
        />

        {items.map(inv => (
          <InventoryItemCard
            key={inv.inventory_id}
            item={inv}
            active={equippedInventoryId === inv.inventory_id}
            loading={loadingId === inv.inventory_id}
            onClick={() => onEquip(inv.inventory_id, slot)}
          />
        ))}
      </div>
    </section>
  )
}

export default function InventoryModal({ isOpen, onClose, user }) {
  const { t } = useTranslation("inventory")
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(false)
  const [equippingId, setEquippingId] = useState(null)

  const fetchInventory = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    setLoading(true)

    try {
      const res = await fetch("/api/shop/@me/inventory", { headers })
      const data = await res.json()
      setInventory(data.items || [])
    } catch {
      notify(t("errors.loadFailed"), "error")
    }

    setLoading(false)
  }, [t])

  useEffect(() => {
    if (!isOpen) return
    fetchInventory()
  }, [isOpen, fetchInventory])

  const grouped = useMemo(() => {
    const groups = {}
    for (const s of SLOTS) groups[s] = []

    for (const entry of inventory) {
      const type = entry.item?.item_type || entry.item_type
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

  const equippedDecoration = useMemo(() => {
    return inventory.find(
      e =>
        e.equipped_slot === "avatar_decoration" &&
        (e.item?.item_type || e.item_type) === "avatar_decoration"
    )?.item?.asset_url || null
  }, [inventory])

  const slotsWithItems = useMemo(() => {
    return SLOTS.filter(s => (grouped[s] || []).length > 0 || equippedBySlot[s])
  }, [grouped, equippedBySlot])

  async function handleEquip(inventoryId, slot) {
    const headers = await getAuthHeaders()
    if (!headers) {
      notify(t("errors.loginRequired"), "error")
      return
    }

    setEquippingId(inventoryId || `none:${slot}`)

    try {
      const res = await fetch("/api/shop/@me/equip", {
        method: "POST",
        headers,
        body: JSON.stringify({ inventoryId, slot }),
      })

      const data = await res.json()

      if (!res.ok) {
        notify(data.error || t("errors.equipFailed"), "error")
        setEquippingId(null)
        return
      }

      const next = inventory.map(entry => ({
        ...entry,
        equipped_slot:
          (entry.item?.item_type || entry.item_type) === slot
            ? null
            : entry.equipped_slot,
      }))

      if (inventoryId) {
        const idx = next.findIndex(e => e.inventory_id === inventoryId)
        if (idx !== -1) next[idx].equipped_slot = slot
      }

      setInventory(next)
      notify(inventoryId ? t("success.equipped") : t("success.unequipped"), "success")
    } catch {
      notify(t("errors.equipFailed"), "error")
    }

    setEquippingId(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-5xl"
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

            <div className="hidden sm:flex items-center gap-3">
              <AvatarWithDecoration
                src={user?.avatar}
                alt={user?.username || "User"}
                size="md"
                showStatus={false}
                decorationUrl={equippedDecoration}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.username}</p>
                <p className="text-xs text-zinc-500">
                  {inventory.length} {inventory.length === 1 ? t("itemCount") : t("itemsCount")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
            </div>
          ) : inventory.length === 0 ? (
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
                loadingId={equippingId}
                onEquip={handleEquip}
              />
            ))
          )}
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all cursor-pointer"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
