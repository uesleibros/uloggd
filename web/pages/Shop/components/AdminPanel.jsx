import { useState, useEffect } from "react"
import { Settings, Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronRight, Package, Layers, FolderOpen, Palette, Loader2, Link2 } from "lucide-react"
import { adminApi } from "../utils/adminApi"
import { notify } from "@components/UI/Notification"
import Modal from "@components/UI/Modal"
import { MINERALS } from "@components/Minerals/MineralRow"

const ITEM_TYPES = ["avatar_decoration", "banner", "profile_effect", "badge", "name_color", "theme"]

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text", ...props }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
      {...props}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
    />
  )
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      <span className="text-sm text-zinc-400">{label}</span>
    </label>
  )
}

function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p className="text-xs text-red-400 flex-1">
        Delete <span className="font-medium text-red-300">{name}</span>?
      </p>
      <button onClick={onCancel} className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
        Cancel
      </button>
      <button onClick={onConfirm} className="px-2.5 py-1 text-xs font-medium text-red-400 bg-red-500/15 hover:bg-red-500/25 rounded transition-colors cursor-pointer">
        Delete
      </button>
    </div>
  )
}

function CategoryForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    slug: "", name: "", description: "", sort_order: 0, is_active: true,
    ...initial,
  })

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === "name" && (!initial || !initial.id)) next.slug = slugify(v)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input value={form.name} onChange={v => set("name", v)} placeholder="Category name" /></Field>
        <Field label="Slug"><Input value={form.slug} onChange={v => set("slug", v)} placeholder="category-slug" /></Field>
      </div>
      <Field label="Description"><Textarea value={form.description} onChange={v => set("description", v)} placeholder="Optional description" rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort Order"><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-end pb-1"><Toggle checked={form.is_active} onChange={v => set("is_active", v)} label="Active" /></div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg transition-colors cursor-pointer">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.slug} className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {initial?.id ? "Update" : "Create"}
        </button>
      </div>
    </div>
  )
}

function CollectionForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    slug: "", name: "", description: "", banner_url: "", accent_color: "",
    is_featured: false, is_active: true, available_from: "", available_until: "", sort_order: 0,
    ...initial,
  })

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === "name" && (!initial || !initial.id)) next.slug = slugify(v)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input value={form.name} onChange={v => set("name", v)} placeholder="Collection name" /></Field>
        <Field label="Slug"><Input value={form.slug} onChange={v => set("slug", v)} placeholder="collection-slug" /></Field>
      </div>
      <Field label="Description"><Textarea value={form.description} onChange={v => set("description", v)} placeholder="Optional description" rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Banner URL"><Input value={form.banner_url} onChange={v => set("banner_url", v)} placeholder="https://..." /></Field>
        <Field label="Accent Color"><Input value={form.accent_color} onChange={v => set("accent_color", v)} placeholder="#8b5cf6" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Available From"><Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} /></Field>
        <Field label="Available Until"><Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Sort Order"><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-end pb-1"><Toggle checked={form.is_active} onChange={v => set("is_active", v)} label="Active" /></div>
        <div className="flex items-end pb-1"><Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label="Featured" /></div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg transition-colors cursor-pointer">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.slug} className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {initial?.id ? "Update" : "Create"}
        </button>
      </div>
    </div>
  )
}

function ItemForm({ initial, categories, artists: allArtists, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    slug: "", name: "", description: "", asset_url: "", item_type: "avatar_decoration",
    category_id: categories[0]?.id || "", is_active: true, is_featured: false, is_limited: false,
    max_stock: "", current_stock: "", available_from: "", available_until: "",
    sort_order: 0, artist_ids: [],
    price_copper: 0, price_iron: 0, price_gold: 0, price_emerald: 0, price_diamond: 0, price_ruby: 0,
    ...initial,
    artist_ids: initial?.artists?.map(a => a.artist?.id).filter(Boolean) || [],
  })

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === "name" && (!initial || !initial.id)) next.slug = slugify(v)
      return next
    })
  }

  const toggleArtist = (id) => {
    setForm(prev => ({
      ...prev,
      artist_ids: prev.artist_ids.includes(id)
        ? prev.artist_ids.filter(a => a !== id)
        : [...prev.artist_ids, id],
    }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input value={form.name} onChange={v => set("name", v)} placeholder="Item name" /></Field>
        <Field label="Slug"><Input value={form.slug} onChange={v => set("slug", v)} placeholder="item-slug" /></Field>
      </div>
      <Field label="Description"><Textarea value={form.description} onChange={v => set("description", v)} placeholder="Optional description" rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Asset URL"><Input value={form.asset_url} onChange={v => set("asset_url", v)} placeholder="https://..." /></Field>
        <Field label="Type">
          <Select value={form.item_type} onChange={v => set("item_type", v)} options={ITEM_TYPES.map(t => ({ value: t, label: t.replace(/_/g, " ") }))} />
        </Field>
      </div>
      <Field label="Category">
        <Select value={form.category_id} onChange={v => set("category_id", parseInt(v))} options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder="Select category" />
      </Field>

      <div>
        <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Prices</span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MINERALS.map(m => (
            <div key={m.key}>
              <div className="flex items-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: m.color }} />
                <span className="text-[10px] text-zinc-500 capitalize">{m.key}</span>
              </div>
              <Input type="number" value={form[`price_${m.key}`]} onChange={v => set(`price_${m.key}`, parseInt(v) || 0)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Available From"><Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} /></Field>
        <Field label="Available Until"><Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} /></Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Sort Order"><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <Field label="Max Stock"><Input type="number" value={form.max_stock} onChange={v => set("max_stock", v ? parseInt(v) : "")} placeholder="∞" /></Field>
        <Field label="Current Stock"><Input type="number" value={form.current_stock} onChange={v => set("current_stock", v ? parseInt(v) : "")} placeholder="∞" /></Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Toggle checked={form.is_active} onChange={v => set("is_active", v)} label="Active" />
        <Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label="Featured" />
        <Toggle checked={form.is_limited} onChange={v => set("is_limited", v)} label="Limited" />
      </div>

      {allArtists.length > 0 && (
        <div>
          <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Artists</span>
          <div className="flex flex-wrap gap-2">
            {allArtists.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleArtist(a.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                  form.artist_ids.includes(a.id)
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                    : "border-zinc-700/60 bg-zinc-800/40 text-zinc-400 hover:text-zinc-300"
                }`}
              >
                {a.avatar_url && <img src={a.avatar_url} alt="" className="w-4 h-4 rounded-full" />}
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg transition-colors cursor-pointer">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.slug || !form.category_id} className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {initial?.id ? "Update" : "Create"}
        </button>
      </div>
    </div>
  )
}

function ArtistForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    id: "", name: "", avatar_url: "", url: "", listed: true, sort_order: 0,
    ...initial,
  })

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === "name" && (!initial || !initial.id)) next.id = slugify(v)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input value={form.name} onChange={v => set("name", v)} placeholder="Artist name" /></Field>
        <Field label="ID"><Input value={form.id} onChange={v => set("id", v)} placeholder="artist-id" disabled={!!initial?.id} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Avatar URL"><Input value={form.avatar_url} onChange={v => set("avatar_url", v)} placeholder="https://..." /></Field>
        <Field label="URL"><Input value={form.url} onChange={v => set("url", v)} placeholder="https://..." /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort Order"><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-end pb-1"><Toggle checked={form.listed} onChange={v => set("listed", v)} label="Listed" /></div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg transition-colors cursor-pointer">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.id} className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {initial?.id ? "Update" : "Create"}
        </button>
      </div>
    </div>
  )
}

function CollectionItemsManager({ collection, allItems, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadItems()
  }, [collection.id])

  async function loadItems() {
    try {
      const res = await fetch(`/api/shop/collections?slug=${collection.slug}`)
      const data = await res.json()
      const col = data?.collection || data?.collections?.[0]
      setItems(col?.items || [])
    } catch {}
    setLoading(false)
  }

  async function addItem(itemId) {
    setAdding(true)
    try {
      await adminApi.addCollectionItem(collection.id, itemId, items.length)
      await loadItems()
      notify("Item added", "success")
    } catch (e) {
      notify(e.message, "error")
    }
    setAdding(false)
  }

  async function removeItem(itemId) {
    try {
      await adminApi.removeCollectionItem(collection.id, itemId)
      await loadItems()
      notify("Item removed", "success")
    } catch (e) {
      notify(e.message, "error")
    }
  }

  const currentItemIds = new Set(items.map(i => i.id))
  const availableItems = allItems.filter(i => !currentItemIds.has(i.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Items in "{collection.name}"</h3>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
      ) : (
        <>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {items.length === 0 && <p className="text-xs text-zinc-600 py-4 text-center">No items yet</p>}
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-zinc-800/40 rounded-lg">
                <div className="flex items-center gap-2.5">
                  {item.asset_url && <img src={item.asset_url} alt="" className="w-6 h-6 object-contain rounded" />}
                  <span className="text-sm text-zinc-300">{item.name}</span>
                  <span className="text-[10px] text-zinc-600">{item.item_type}</span>
                </div>
                <button onClick={() => removeItem(item.id)} className="p-1 text-zinc-600 hover:text-red-400 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {availableItems.length > 0 && (
            <div>
              <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Add Items</span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {availableItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item.id)}
                    disabled={adding}
                    className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800/20 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.asset_url && <img src={item.asset_url} alt="" className="w-6 h-6 object-contain rounded" />}
                      <span className="text-sm text-zinc-400">{item.name}</span>
                      <span className="text-[10px] text-zinc-600">{item.item_type}</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-zinc-600" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const TABS = [
  { key: "items", label: "Items", icon: Package },
  { key: "collections", label: "Collections", icon: Layers },
  { key: "categories", label: "Categories", icon: FolderOpen },
  { key: "artists", label: "Artists", icon: Palette },
]

export default function AdminPanel({ isOpen, onClose }) {
  const [tab, setTab] = useState("items")
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])
  const [items, setItems] = useState([])
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)

  const [formMode, setFormMode] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [managingCollection, setManagingCollection] = useState(null)

  useEffect(() => {
    if (isOpen) loadAll()
  }, [isOpen])

  async function loadAll() {
    setLoading(true)
    try {
      const [catRes, colRes, itemRes, artRes] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getCollections(),
        adminApi.getItems(),
        adminApi.getArtists(),
      ])
      setCategories(catRes.categories || [])
      setCollections(colRes.collections || [])
      setItems(itemRes.items || [])
      setArtists(artRes.artists || [])
    } catch (e) {
      notify("Failed to load admin data", "error")
    }
    setLoading(false)
  }

  function resetForm() {
    setFormMode(null)
    setEditingItem(null)
  }

  async function saveCategory(form) {
    setSaving(true)
    try {
      if (form.id) {
        await adminApi.updateCategory(form)
      } else {
        await adminApi.createCategory(form)
      }
      await loadAll()
      resetForm()
      notify("Category saved", "success")
    } catch (e) {
      notify(e.message, "error")
    }
    setSaving(false)
  }

  async function saveCollection(form) {
    setSaving(true)
    try {
      if (form.id) {
        await adminApi.updateCollection(form)
      } else {
        await adminApi.createCollection(form)
      }
      await loadAll()
      resetForm()
      notify("Collection saved", "success")
    } catch (e) {
      notify(e.message, "error")
    }
    setSaving(false)
  }

  async function saveItem(form) {
    setSaving(true)
    try {
      if (form.id) {
        await adminApi.updateItem(form)
      } else {
        await adminApi.createItem(form)
      }
      await loadAll()
      resetForm()
      notify("Item saved", "success")
    } catch (e) {
      notify(e.message, "error")
    }
    setSaving(false)
  }

  async function saveArtist(form) {
    setSaving(true)
    try {
      if (editingItem) {
        await adminApi.updateArtist(form)
      } else {
        await adminApi.createArtist(form)
      }
      await loadAll()
      resetForm()
      notify("Artist saved", "success")
    } catch (e) {
      notify(e.message, "error")
    }
    setSaving(false)
  }

  async function handleDelete(type, id, name) {
    try {
      if (type === "category") await adminApi.deleteCategory(id)
      else if (type === "collection") await adminApi.deleteCollection(id)
      else if (type === "item") await adminApi.deleteItem(id)
      else if (type === "artist") await adminApi.deleteArtist(id)
      await loadAll()
      setDeleteTarget(null)
      notify(`${name} deleted`, "success")
    } catch (e) {
      notify(e.message, "error")
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" showCloseButton={false} className="!border-0 !bg-transparent !shadow-none">
      <div className="overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">Shop Admin</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex border-b border-zinc-800/60">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); resetForm(); setManagingCollection(null) }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                tab === t.key ? "text-white border-b-2 border-violet-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
          ) : (
            <>
              {tab === "categories" && (
                <div className="space-y-4">
                  {formMode === "category" ? (
                    <CategoryForm initial={editingItem} onSave={saveCategory} onCancel={resetForm} saving={saving} />
                  ) : (
                    <>
                      <button onClick={() => setFormMode("category")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> New Category
                      </button>
                      <div className="space-y-1.5">
                        {categories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
                            <div>
                              <span className="text-sm font-medium text-zinc-200">{cat.name}</span>
                              <span className="text-xs text-zinc-600 ml-2">{cat.slug}</span>
                              {!cat.is_active && <span className="text-[10px] text-amber-500 ml-2">inactive</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              {deleteTarget?.id === cat.id ? (
                                <DeleteConfirm name={cat.name} onConfirm={() => handleDelete("category", cat.id, cat.name)} onCancel={() => setDeleteTarget(null)} />
                              ) : (
                                <>
                                  <button onClick={() => { setEditingItem(cat); setFormMode("category") }} className="p-1.5 text-zinc-600 hover:text-zinc-300 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setDeleteTarget(cat)} className="p-1.5 text-zinc-600 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {categories.length === 0 && <p className="text-xs text-zinc-600 text-center py-8">No categories yet</p>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === "collections" && (
                <div className="space-y-4">
                  {managingCollection ? (
                    <CollectionItemsManager collection={managingCollection} allItems={items} onClose={() => setManagingCollection(null)} />
                  ) : formMode === "collection" ? (
                    <CollectionForm initial={editingItem} onSave={saveCollection} onCancel={resetForm} saving={saving} />
                  ) : (
                    <>
                      <button onClick={() => setFormMode("collection")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> New Collection
                      </button>
                      <div className="space-y-1.5">
                        {collections.map(col => (
                          <div key={col.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
                            <div className="flex items-center gap-3">
                              {col.banner_url && <img src={col.banner_url} alt="" className="w-10 h-6 object-cover rounded" />}
                              <div>
                                <span className="text-sm font-medium text-zinc-200">{col.name}</span>
                                <span className="text-xs text-zinc-600 ml-2">{col.slug}</span>
                                {col.is_featured && <span className="text-[10px] text-violet-400 ml-2">featured</span>}
                                {!col.is_active && <span className="text-[10px] text-amber-500 ml-2">inactive</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {deleteTarget?.id === col.id ? (
                                <DeleteConfirm name={col.name} onConfirm={() => handleDelete("collection", col.id, col.name)} onCancel={() => setDeleteTarget(null)} />
                              ) : (
                                <>
                                  <button onClick={() => setManagingCollection(col)} className="p-1.5 text-zinc-600 hover:text-zinc-300 cursor-pointer" title="Manage items"><Link2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingItem(col); setFormMode("collection") }} className="p-1.5 text-zinc-600 hover:text-zinc-300 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setDeleteTarget(col)} className="p-1.5 text-zinc-600 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {collections.length === 0 && <p className="text-xs text-zinc-600 text-center py-8">No collections yet</p>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === "items" && (
                <div className="space-y-4">
                  {formMode === "item" ? (
                    <ItemForm initial={editingItem} categories={categories} artists={artists} onSave={saveItem} onCancel={resetForm} saving={saving} />
                  ) : (
                    <>
                      <button onClick={() => setFormMode("item")} disabled={categories.length === 0} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <Plus className="w-3.5 h-3.5" /> New Item
                        {categories.length === 0 && <span className="text-zinc-600 ml-1">(create a category first)</span>}
                      </button>
                      <div className="space-y-1.5">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
                            <div className="flex items-center gap-3">
                              {item.asset_url && <img src={item.asset_url} alt="" className="w-8 h-8 object-contain rounded" />}
                              <div>
                                <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                                <span className="text-[10px] text-zinc-600 ml-2">{item.item_type}</span>
                                <span className="text-[10px] text-zinc-700 ml-2">{item.category?.name}</span>
                                {item.is_featured && <span className="text-[10px] text-violet-400 ml-2">featured</span>}
                                {!item.is_active && <span className="text-[10px] text-amber-500 ml-2">inactive</span>}
                                {item.is_limited && <span className="text-[10px] text-amber-400 ml-2">limited ({item.current_stock}/{item.max_stock})</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {deleteTarget?.id === item.id ? (
                                <DeleteConfirm name={item.name} onConfirm={() => handleDelete("item", item.id, item.name)} onCancel={() => setDeleteTarget(null)} />
                              ) : (
                                <>
                                  <button onClick={() => { setEditingItem(item); setFormMode("item") }} className="p-1.5 text-zinc-600 hover:text-zinc-300 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-zinc-600 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.length === 0 && <p className="text-xs text-zinc-600 text-center py-8">No items yet</p>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === "artists" && (
                <div className="space-y-4">
                  {formMode === "artist" ? (
                    <ArtistForm initial={editingItem} onSave={saveArtist} onCancel={resetForm} saving={saving} />
                  ) : (
                    <>
                      <button onClick={() => setFormMode("artist")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> New Artist
                      </button>
                      <div className="space-y-1.5">
                        {artists.map(artist => (
                          <div key={artist.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
                            <div className="flex items-center gap-3">
                              {artist.avatar_url && <img src={artist.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />}
                              <div>
                                <span className="text-sm font-medium text-zinc-200">{artist.name}</span>
                                <span className="text-xs text-zinc-600 ml-2">{artist.id}</span>
                                {!artist.listed && <span className="text-[10px] text-amber-500 ml-2">unlisted</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {deleteTarget?.id === artist.id ? (
                                <DeleteConfirm name={artist.name} onConfirm={() => handleDelete("artist", artist.id, artist.name)} onCancel={() => setDeleteTarget(null)} />
                              ) : (
                                <>
                                  <button onClick={() => { setEditingItem(artist); setFormMode("artist") }} className="p-1.5 text-zinc-600 hover:text-zinc-300 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setDeleteTarget(artist)} className="p-1.5 text-zinc-600 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {artists.length === 0 && <p className="text-xs text-zinc-600 text-center py-8">No artists yet</p>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}