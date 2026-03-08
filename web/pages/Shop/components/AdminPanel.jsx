import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, Save, Package, Layers, FolderOpen, Palette, Loader2, Link2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { adminApi } from "../utils/adminApi"
import { notify } from "@components/UI/Notification"
import Modal from "@components/UI/Modal"
import { MINERALS } from "@components/Minerals/MineralRow"

const ITEM_TYPES = ["avatar_decoration", "banner", "profile_effect", "badge", "name_color", "theme"]

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "")
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

function DeleteConfirm({ name, onConfirm, onCancel, t }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p className="text-xs text-red-400 flex-1">
        {t("admin.deleteConfirm", { name })}
      </p>
      <button onClick={onCancel} className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
        {t("admin.cancel")}
      </button>
      <button onClick={onConfirm} className="px-2.5 py-1 text-xs font-medium text-red-400 bg-red-500/15 hover:bg-red-500/25 rounded transition-colors cursor-pointer">
        {t("admin.delete")}
      </button>
    </div>
  )
}

function FormActions({ onCancel, onSave, saving, disabled, isEdit, t }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg transition-colors cursor-pointer">
        {t("admin.cancel")}
      </button>
      <button
        onClick={onSave}
        disabled={saving || disabled}
        className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {isEdit ? t("admin.update") : t("admin.create")}
      </button>
    </div>
  )
}

function CategoryForm({ initial, onSave, onCancel, saving, t }) {
  const [form, setForm] = useState({
    slug: "", name: "", description: "", sort_order: 0, is_active: true,
    ...initial,
  })

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === "name" && !initial?.id) next.slug = slugify(v)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.slug")}><Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} /></Field>
      </div>
      <Field label={t("admin.fields.description")}><Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-end pb-1"><Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} /></div>
      </div>
      <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={saving} disabled={!form.name || !form.slug} isEdit={!!initial?.id} t={t} />
    </div>
  )
}

function CollectionForm({ initial, onSave, onCancel, saving, t }) {
  const [form, setForm] = useState({
    slug: "", name: "", description: "", banner_url: "", accent_color: "",
    is_featured: false, is_active: true, available_from: "", available_until: "", sort_order: 0,
    ...initial,
  })

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === "name" && !initial?.id) next.slug = slugify(v)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.slug")}><Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} /></Field>
      </div>
      <Field label={t("admin.fields.description")}><Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.bannerUrl")}><Input value={form.banner_url} onChange={v => set("banner_url", v)} placeholder={t("admin.placeholders.url")} /></Field>
        <Field label={t("admin.fields.accentColor")}><Input value={form.accent_color} onChange={v => set("accent_color", v)} placeholder={t("admin.placeholders.color")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.availableFrom")}><Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} /></Field>
        <Field label={t("admin.fields.availableUntil")}><Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-end pb-1"><Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} /></div>
        <div className="flex items-end pb-1"><Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label={t("admin.fields.featured")} /></div>
      </div>
      <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={saving} disabled={!form.name || !form.slug} isEdit={!!initial?.id} t={t} />
    </div>
  )
}

function ItemForm({ initial, categories, artists: allArtists, onSave, onCancel, saving, t }) {
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
      if (k === "name" && !initial?.id) next.slug = slugify(v)
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
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.slug")}><Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} /></Field>
      </div>
      <Field label={t("admin.fields.description")}><Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.assetUrl")}><Input value={form.asset_url} onChange={v => set("asset_url", v)} placeholder={t("admin.placeholders.url")} /></Field>
        <Field label={t("admin.fields.type")}>
          <Select value={form.item_type} onChange={v => set("item_type", v)} options={ITEM_TYPES.map(tp => ({ value: tp, label: tp.replace(/_/g, " ") }))} />
        </Field>
      </div>
      <Field label={t("admin.fields.category")}>
        <Select value={form.category_id} onChange={v => set("category_id", parseInt(v))} options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder={t("admin.fields.selectCategory")} />
      </Field>

      <div>
        <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">{t("admin.fields.prices")}</span>
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
        <Field label={t("admin.fields.availableFrom")}><Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} /></Field>
        <Field label={t("admin.fields.availableUntil")}><Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} /></Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <Field label={t("admin.fields.maxStock")}><Input type="number" value={form.max_stock} onChange={v => set("max_stock", v ? parseInt(v) : "")} placeholder={t("admin.placeholders.unlimited")} /></Field>
        <Field label={t("admin.fields.currentStock")}><Input type="number" value={form.current_stock} onChange={v => set("current_stock", v ? parseInt(v) : "")} placeholder={t("admin.placeholders.unlimited")} /></Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} />
        <Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label={t("admin.fields.featured")} />
        <Toggle checked={form.is_limited} onChange={v => set("is_limited", v)} label={t("admin.fields.limited")} />
      </div>

      {allArtists.length > 0 && (
        <div>
          <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">{t("admin.fields.artists")}</span>
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

      <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={saving} disabled={!form.name || !form.slug || !form.category_id} isEdit={!!initial?.id} t={t} />
    </div>
  )
}

function ArtistForm({ initial, onSave, onCancel, saving, t }) {
  const [form, setForm] = useState({
    id: "", name: "", avatar_url: "", url: "", listed: true, sort_order: 0,
    ...initial,
  })

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === "name" && !initial?.id) next.id = slugify(v)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.id")}><Input value={form.id} onChange={v => set("id", v)} placeholder={t("admin.placeholders.id")} disabled={!!initial?.id} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.avatarUrl")}><Input value={form.avatar_url} onChange={v => set("avatar_url", v)} placeholder={t("admin.placeholders.url")} /></Field>
        <Field label={t("admin.fields.url")}><Input value={form.url} onChange={v => set("url", v)} placeholder={t("admin.placeholders.url")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-end pb-1"><Toggle checked={form.listed} onChange={v => set("listed", v)} label={t("admin.fields.listed")} /></div>
      </div>
      <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={saving} disabled={!form.name || !form.id} isEdit={!!initial?.id} t={t} />
    </div>
  )
}

function CollectionItemsManager({ collection, allItems, onClose, t }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadItems() }, [collection.id])

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
      notify(t("admin.collectionItems.added"), "success")
    } catch (e) {
      notify(e.message, "error")
    }
    setAdding(false)
  }

  async function removeItem(itemId) {
    try {
      await adminApi.removeCollectionItem(collection.id, itemId)
      await loadItems()
      notify(t("admin.collectionItems.removed"), "success")
    } catch (e) {
      notify(e.message, "error")
    }
  }

  const currentItemIds = new Set(items.map(i => i.id))
  const availableItems = allItems.filter(i => !currentItemIds.has(i.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{t("admin.collectionItems.title", { name: collection.name })}</h3>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
      ) : (
        <>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {items.length === 0 && <p className="text-xs text-zinc-600 py-4 text-center">{t("admin.collectionItems.empty")}</p>}
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
              <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">{t("admin.collectionItems.addItems")}</span>
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
  { key: "items", icon: Package },
  { key: "collections", icon: Layers },
  { key: "categories", icon: FolderOpen },
  { key: "artists", icon: Palette },
]

export default function AdminPanel({ isOpen, onClose }) {
  const { t } = useTranslation("shop")

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
    } catch {
      notify(t("admin.loadFailed"), "error")
    }
    setLoading(false)
  }

  function resetForm() {
    setFormMode(null)
    setEditingItem(null)
  }

  async function handleSave(type, apiFn, form) {
    setSaving(true)
    try {
      await apiFn(form)
      await loadAll()
      resetForm()
      notify(t("admin.saved", { type }), "success")
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
      notify(t("admin.deleted", { name }), "success")
    } catch (e) {
      notify(e.message, "error")
    }
  }

  function renderList(dataList, type, emptyKey, renderRow) {
    if (dataList.length === 0) {
      return <p className="text-xs text-zinc-600 text-center py-8">{t(emptyKey)}</p>
    }
    return <div className="space-y-1.5">{dataList.map(item => renderRow(item))}</div>
  }

  function renderRowActions(item, type) {
    if (deleteTarget?.id === item.id) {
      return <DeleteConfirm name={item.name} onConfirm={() => handleDelete(type, item.id, item.name)} onCancel={() => setDeleteTarget(null)} t={t} />
    }
    return (
      <div className="flex items-center gap-1">
        {type === "collection" && (
          <button onClick={() => setManagingCollection(item)} className="p-1.5 text-zinc-600 hover:text-zinc-300 cursor-pointer" title={t("admin.labels.manageItems")}>
            <Link2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => { setEditingItem(item); setFormMode(type) }} className="p-1.5 text-zinc-600 hover:text-zinc-300 cursor-pointer">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-zinc-600 hover:text-red-400 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  function renderContent() {
    if (loading) {
      return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
    }

    if (tab === "categories") {
      if (formMode === "category") {
        return <CategoryForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.categories"), form.id ? adminApi.updateCategory : adminApi.createCategory, form)} onCancel={resetForm} saving={saving} t={t} />
      }
      return (
        <div className="space-y-4">
          <button onClick={() => setFormMode("category")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> {t("admin.newCategory")}
          </button>
          {renderList(categories, "category", "admin.noCategories", cat => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
              <div>
                <span className="text-sm font-medium text-zinc-200">{cat.name}</span>
                <span className="text-xs text-zinc-600 ml-2">{cat.slug}</span>
                {!cat.is_active && <span className="text-[10px] text-amber-500 ml-2">{t("admin.labels.inactive")}</span>}
              </div>
              {renderRowActions(cat, "category")}
            </div>
          ))}
        </div>
      )
    }

    if (tab === "collections") {
      if (managingCollection) {
        return <CollectionItemsManager collection={managingCollection} allItems={items} onClose={() => setManagingCollection(null)} t={t} />
      }
      if (formMode === "collection") {
        return <CollectionForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.collections"), form.id ? adminApi.updateCollection : adminApi.createCollection, form)} onCancel={resetForm} saving={saving} t={t} />
      }
      return (
        <div className="space-y-4">
          <button onClick={() => setFormMode("collection")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> {t("admin.newCollection")}
          </button>
          {renderList(collections, "collection", "admin.noCollections", col => (
            <div key={col.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
              <div className="flex items-center gap-3">
                {col.banner_url && <img src={col.banner_url} alt="" className="w-10 h-6 object-cover rounded" />}
                <div>
                  <span className="text-sm font-medium text-zinc-200">{col.name}</span>
                  <span className="text-xs text-zinc-600 ml-2">{col.slug}</span>
                  {col.is_featured && <span className="text-[10px] text-violet-400 ml-2">{t("admin.labels.featured")}</span>}
                  {!col.is_active && <span className="text-[10px] text-amber-500 ml-2">{t("admin.labels.inactive")}</span>}
                </div>
              </div>
              {renderRowActions(col, "collection")}
            </div>
          ))}
        </div>
      )
    }

    if (tab === "items") {
      if (formMode === "item") {
        return <ItemForm initial={editingItem} categories={categories} artists={artists} onSave={form => handleSave(t("admin.tabs.items"), form.id ? adminApi.updateItem : adminApi.createItem, form)} onCancel={resetForm} saving={saving} t={t} />
      }
      return (
        <div className="space-y-4">
          <button onClick={() => setFormMode("item")} disabled={categories.length === 0} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="w-3.5 h-3.5" /> {t("admin.newItem")}
            {categories.length === 0 && <span className="text-zinc-600 ml-1">{t("admin.createCategoryFirst")}</span>}
          </button>
          {renderList(items, "item", "admin.noItems", item => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
              <div className="flex items-center gap-3">
                {item.asset_url && <img src={item.asset_url} alt="" className="w-8 h-8 object-contain rounded" />}
                <div>
                  <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                  <span className="text-[10px] text-zinc-600 ml-2">{item.item_type}</span>
                  <span className="text-[10px] text-zinc-700 ml-2">{item.category?.name}</span>
                  {item.is_featured && <span className="text-[10px] text-violet-400 ml-2">{t("admin.labels.featured")}</span>}
                  {!item.is_active && <span className="text-[10px] text-amber-500 ml-2">{t("admin.labels.inactive")}</span>}
                  {item.is_limited && <span className="text-[10px] text-amber-400 ml-2">{t("admin.labels.limited")} ({item.current_stock}/{item.max_stock})</span>}
                </div>
              </div>
              {renderRowActions(item, "item")}
            </div>
          ))}
        </div>
      )
    }

    if (tab === "artists") {
      if (formMode === "artist") {
        return <ArtistForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.artists"), editingItem ? adminApi.updateArtist : adminApi.createArtist, form)} onCancel={resetForm} saving={saving} t={t} />
      }
      return (
        <div className="space-y-4">
          <button onClick={() => setFormMode("artist")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> {t("admin.newArtist")}
          </button>
          {renderList(artists, "artist", "admin.noArtists", artist => (
            <div key={artist.id} className="flex items-center justify-between px-4 py-3 bg-zinc-800/40 rounded-lg">
              <div className="flex items-center gap-3">
                {artist.avatar_url && <img src={artist.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />}
                <div>
                  <span className="text-sm font-medium text-zinc-200">{artist.name}</span>
                  <span className="text-xs text-zinc-600 ml-2">{artist.id}</span>
                  {!artist.listed && <span className="text-[10px] text-amber-500 ml-2">{t("admin.labels.unlisted")}</span>}
                </div>
              </div>
              {renderRowActions(artist, "artist")}
            </div>
          ))}
        </div>
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.title")}
      maxWidth="max-w-3xl"
      fullscreenMobile
      showMobileGrip
    >
      <div className="border-b border-zinc-700 px-1 flex">
        {TABS.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => { setTab(tabItem.key); resetForm(); setManagingCollection(null) }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === tabItem.key ? "text-white border-b-2 border-violet-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <tabItem.icon className="w-3.5 h-3.5" />
            {t(`admin.tabs.${tabItem.key}`)}
          </button>
        ))}
      </div>

      <div className="p-5">
        {renderContent()}
      </div>
    </Modal>
  )
}