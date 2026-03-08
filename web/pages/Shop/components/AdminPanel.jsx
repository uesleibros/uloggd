import { useState, useEffect, useMemo } from "react"
import { Plus, Pencil, Trash2, X, Save, Package, Layers, FolderOpen, Palette, Loader2, Link2, Search, Filter, ChevronLeft, ChevronRight, GripVertical } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { adminApi } from "../utils/adminApi"
import { notify } from "@components/UI/Notification"
import Modal from "@components/UI/Modal"
import { MINERALS } from "@components/Minerals/MineralRow"
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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

function Input({ value, onChange, placeholder, type = "text", icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />}
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full py-2.5 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all ${Icon ? "pl-9 pr-3" : "px-3"}`}
        {...props}
      />
    </div>
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
    />
  )
}

function Select({ value, onChange, options, placeholder, icon: Icon }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />}
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className={`w-full py-2.5 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none ${Icon ? "pl-9 pr-8" : "px-3 pr-8"}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "left-[22px]" : "left-1"}`} />
      </button>
      <span className="text-sm font-medium text-zinc-300">{label}</span>
    </label>
  )
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t border-zinc-800/60 mt-4">
      <span className="text-xs text-zinc-500">
        Página {currentPage} de {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative'
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <div {...attributes} {...listeners} className="p-2 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 opacity-50 group-hover:opacity-100 transition-opacity touch-none">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}

function DeleteConfirm({ name, onConfirm, onCancel, t }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl w-full sm:w-auto">
      <p className="text-xs text-red-400 flex-1 truncate mr-2">
        {t("admin.deleteConfirm", { name })}
      </p>
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer rounded-lg hover:bg-zinc-800/50">
        {t("admin.cancel")}
      </button>
      <button onClick={onConfirm} className="px-3 py-1.5 text-xs font-medium text-red-100 bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer shadow-sm">
        {t("admin.delete")}
      </button>
    </div>
  )
}

function FormActions({ onCancel, onSave, saving, disabled, isEdit, t }) {
  return (
    <div className="flex gap-3 pt-4 border-t border-zinc-800/80 mt-6 sticky bottom-0 bg-zinc-900/95 backdrop-blur py-4 z-10">
      <button onClick={onCancel} className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-xl transition-colors cursor-pointer">
        {t("admin.cancel")}
      </button>
      <button
        onClick={onSave}
        disabled={saving || disabled}
        className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 disabled:shadow-none"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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

  const set = (k, v) => setForm(p => ({ ...p, [k]: v, ...(k === "name" && !initial?.id ? { slug: slugify(v) } : {}) }))

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.slug")}><Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} /></Field>
      </div>
      <Field label={t("admin.fields.description")}><Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={3} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-center pt-2 sm:pt-6"><Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} /></div>
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

  const set = (k, v) => setForm(p => ({ ...p, [k]: v, ...(k === "name" && !initial?.id ? { slug: slugify(v) } : {}) }))

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.slug")}><Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} /></Field>
      </div>
      <Field label={t("admin.fields.description")}><Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("admin.fields.bannerUrl")}><Input value={form.banner_url} onChange={v => set("banner_url", v)} placeholder={t("admin.placeholders.url")} /></Field>
        <Field label={t("admin.fields.accentColor")}>
          <div className="flex gap-2">
            <input type="color" value={form.accent_color || "#000000"} onChange={e => set("accent_color", e.target.value)} className="w-10 h-[42px] rounded-lg cursor-pointer bg-zinc-800/80 border border-zinc-700/60 p-1" />
            <div className="flex-1"><Input value={form.accent_color} onChange={v => set("accent_color", v)} placeholder={t("admin.placeholders.color")} /></div>
          </div>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
        <Field label={t("admin.fields.availableFrom")}><Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} /></Field>
        <Field label={t("admin.fields.availableUntil")}><Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} />
        <Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label={t("admin.fields.featured")} />
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

  const set = (k, v) => setForm(p => ({ ...p, [k]: v, ...(k === "name" && !initial?.id ? { slug: slugify(v) } : {}) }))

  const toggleArtist = (id) => {
    setForm(p => ({
      ...p,
      artist_ids: p.artist_ids.includes(id) ? p.artist_ids.filter(a => a !== id) : [...p.artist_ids, id],
    }))
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.slug")}><Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} /></Field>
      </div>
      <Field label={t("admin.fields.description")}><Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} /></Field>
      
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-6"><Field label={t("admin.fields.assetUrl")}><Input value={form.asset_url} onChange={v => set("asset_url", v)} placeholder={t("admin.placeholders.url")} /></Field></div>
        <div className="sm:col-span-3"><Field label={t("admin.fields.type")}><Select value={form.item_type} onChange={v => set("item_type", v)} options={ITEM_TYPES.map(tp => ({ value: tp, label: tp.replace(/_/g, " ") }))} /></Field></div>
        <div className="sm:col-span-3"><Field label={t("admin.fields.category")}><Select value={form.category_id} onChange={v => set("category_id", parseInt(v))} options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder={t("admin.fields.selectCategory")} /></Field></div>
      </div>

      <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
        <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">{t("admin.fields.prices")}</span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {MINERALS.map(m => (
            <div key={m.key} className="bg-zinc-900/50 p-2 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-medium text-zinc-400 capitalize">{m.key}</span>
              </div>
              <Input type="number" value={form[`price_${m.key}`]} onChange={v => set(`price_${m.key}`, parseInt(v) || 0)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
        <Field label={t("admin.fields.availableFrom")}><Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} /></Field>
        <Field label={t("admin.fields.availableUntil")}><Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} /></Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <Field label={t("admin.fields.maxStock")}><Input type="number" value={form.max_stock} onChange={v => set("max_stock", v ? parseInt(v) : "")} placeholder={t("admin.placeholders.unlimited")} /></Field>
        <Field label={t("admin.fields.currentStock")}><Input type="number" value={form.current_stock} onChange={v => set("current_stock", v ? parseInt(v) : "")} placeholder={t("admin.placeholders.unlimited")} /></Field>
      </div>

      <div className="flex flex-wrap gap-4 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
        <Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} />
        <Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label={t("admin.fields.featured")} />
        <Toggle checked={form.is_limited} onChange={v => set("is_limited", v)} label={t("admin.fields.limited")} />
      </div>

      {allArtists.length > 0 && (
        <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
          <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">{t("admin.fields.artists")}</span>
          <div className="flex flex-wrap gap-2">
            {allArtists.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleArtist(a.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl border transition-all cursor-pointer ${
                  form.artist_ids.includes(a.id)
                    ? "border-violet-500 bg-violet-500/15 text-violet-200 shadow-sm"
                    : "border-zinc-700/60 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {a.avatar_url && <img src={a.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />}
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

  const set = (k, v) => setForm(p => ({ ...p, [k]: v, ...(k === "name" && !initial?.id ? { id: slugify(v) } : {}) }))

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("admin.fields.name")}><Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} /></Field>
        <Field label={t("admin.fields.id")}><Input value={form.id} onChange={v => set("id", v)} placeholder={t("admin.placeholders.id")} disabled={!!initial?.id} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("admin.fields.avatarUrl")}><Input value={form.avatar_url} onChange={v => set("avatar_url", v)} placeholder={t("admin.placeholders.url")} /></Field>
        <Field label={t("admin.fields.url")}><Input value={form.url} onChange={v => set("url", v)} placeholder={t("admin.placeholders.url")} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
        <Field label={t("admin.fields.sortOrder")}><Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} /></Field>
        <div className="flex items-center pt-2 sm:pt-6"><Toggle checked={form.listed} onChange={v => set("listed", v)} label={t("admin.fields.listed")} /></div>
      </div>
      <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={saving} disabled={!form.name || !form.id} isEdit={!!initial?.id} t={t} />
    </div>
  )
}

function CollectionItemsManager({ collection, allItems, onClose, t }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState("")

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  useEffect(() => { loadItems() }, [collection.id])

  async function loadItems() {
    try {
      const res = await fetch(`/api/shop/collections?slug=${collection.slug}`)
      const data = await res.json()
      const col = data?.collection || data?.collections?.[0]
      setItems(col?.items?.sort((a, b) => (a.collection_item?.sort_order || 0) - (b.collection_item?.sort_order || 0)) || [])
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

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        newItems.forEach((item, index) => {
          if (item.collection_item?.sort_order !== index) {
            adminApi.updateCollectionItemOrder(collection.id, item.id, index).catch(() => {})
          }
        })
        return newItems
      })
    }
  }

  const currentItemIds = new Set(items.map(i => i.id))
  const availableItems = allItems.filter(i => 
    !currentItemIds.has(i.id) && 
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 flex flex-col h-[70vh]">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-white">{t("admin.collectionItems.title", { name: collection.name })}</h3>
          <p className="text-xs text-zinc-400 mt-1">Arraste para reordenar os itens da coleção</p>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Itens Atuais ({items.length})</span>
              {items.length === 0 && <div className="p-6 text-center border-2 border-dashed border-zinc-800/80 rounded-2xl"><p className="text-sm text-zinc-500">{t("admin.collectionItems.empty")}</p></div>}
              
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {items.map(item => (
                      <SortableItem key={item.id} id={item.id}>
                        <div className="flex items-center justify-between p-3 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-900/50 rounded-lg flex items-center justify-center p-1">
                              {item.asset_url && <img src={item.asset_url} alt="" className="max-w-full max-h-full object-contain" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{item.item_type.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-800">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t("admin.collectionItems.addItems")}</span>
              <Input 
                value={search} 
                onChange={setSearch} 
                placeholder="Buscar itens para adicionar..." 
                icon={Search} 
              />
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {availableItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item.id)}
                    disabled={adding}
                    className="w-full flex items-center justify-between p-3 bg-zinc-800/20 border border-transparent hover:border-violet-500/30 hover:bg-violet-500/5 rounded-xl transition-all cursor-pointer disabled:opacity-50 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-900/50 rounded-lg flex items-center justify-center p-1">
                        {item.asset_url && <img src={item.asset_url} alt="" className="max-w-full max-h-full object-contain" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{item.name}</p>
                        <p className="text-[10px] text-zinc-600">{item.item_type}</p>
                      </div>
                    </div>
                    <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
                {availableItems.length === 0 && search && (
                   <p className="text-xs text-zinc-500 text-center py-4">Nenhum item encontrado.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
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

  const [filters, setFilters] = useState({ search: "", type: "", category: "", page: 1 })
  const itemsPerPage = 10

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  useEffect(() => {
    if (isOpen) loadAll()
  }, [isOpen])

  useEffect(() => {
    setFilters({ search: "", type: "", category: "", page: 1 })
    resetForm()
    setManagingCollection(null)
  }, [tab])

  async function loadAll() {
    setLoading(true)
    try {
      const [catRes, colRes, itemRes, artRes] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getCollections(),
        adminApi.getItems(),
        adminApi.getArtists(),
      ])
      setCategories((catRes.categories || []).sort((a, b) => a.sort_order - b.sort_order))
      setCollections((colRes.collections || []).sort((a, b) => a.sort_order - b.sort_order))
      setItems((itemRes.items || []).sort((a, b) => b.id - a.id))
      setArtists((artRes.artists || []).sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      notify(t("admin.loadFailed"), "error")
    }
    setLoading(false)
  }

  function resetForm() {
    setFormMode(null)
    setEditingItem(null)
    setDeleteTarget(null)
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

  const handleDragEndList = async (event, type) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dataList = type === "category" ? categories : collections
    const setter = type === "category" ? setCategories : setCollections
    const updater = type === "category" ? adminApi.updateCategory : adminApi.updateCollection

    const oldIndex = dataList.findIndex(i => i.id === active.id)
    const newIndex = dataList.findIndex(i => i.id === over.id)
    const newArray = arrayMove(dataList, oldIndex, newIndex)

    setter(newArray)

    try {
      for (let i = 0; i < newArray.length; i++) {
        if (newArray[i].sort_order !== i) {
          await updater({ ...newArray[i], sort_order: i })
        }
      }
    } catch (e) {
      notify("Erro ao salvar ordem", "error")
      loadAll()
    }
  }

  const filteredData = useMemo(() => {
    let data = []
    if (tab === "items") data = items
    if (tab === "categories") data = categories
    if (tab === "collections") data = collections
    if (tab === "artists") data = artists

    if (filters.search) {
      data = data.filter(d => d.name?.toLowerCase().includes(filters.search.toLowerCase()) || d.slug?.toLowerCase().includes(filters.search.toLowerCase()))
    }
    if (tab === "items" && filters.type) {
      data = data.filter(d => d.item_type === filters.type)
    }
    if (tab === "items" && filters.category) {
      data = data.filter(d => d.category_id === parseInt(filters.category))
    }
    return data
  }, [items, categories, collections, artists, tab, filters])

  const paginatedData = useMemo(() => {
    const start = (filters.page - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, filters.page])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  function renderRowActions(item, type) {
    if (deleteTarget?.id === item.id) {
      return <DeleteConfirm name={item.name} onConfirm={() => handleDelete(type, item.id, item.name)} onCancel={() => setDeleteTarget(null)} t={t} />
    }
    return (
      <div className="flex items-center gap-1.5 ml-auto pl-4">
        {type === "collection" && (
          <button onClick={() => setManagingCollection(item)} className="p-2 text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer" title={t("admin.labels.manageItems")}>
            <Link2 className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => { setEditingItem(item); setFormMode(type) }} className="p-2 text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => setDeleteTarget(item)} className="p-2 text-zinc-500 hover:text-red-400 bg-zinc-800/50 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  function renderFilters(showTypeAndCat = false) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input 
            value={filters.search} 
            onChange={v => setFilters(p => ({ ...p, search: v, page: 1 }))} 
            placeholder="Buscar..." 
            icon={Search} 
          />
        </div>
        {showTypeAndCat && (
          <>
            <div className="w-full sm:w-48">
              <Select 
                value={filters.type} 
                onChange={v => setFilters(p => ({ ...p, type: v, page: 1 }))} 
                options={ITEM_TYPES.map(tp => ({ value: tp, label: tp.replace(/_/g, " ") }))} 
                placeholder="Todos os Tipos"
                icon={Filter}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select 
                value={filters.category} 
                onChange={v => setFilters(p => ({ ...p, category: v, page: 1 }))} 
                options={categories.map(c => ({ value: c.id, label: c.name }))} 
                placeholder="Todas as Categorias"
                icon={FolderOpen}
              />
            </div>
          </>
        )}
      </div>
    )
  }

  function renderContent() {
    if (loading) {
      return <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
    }

    if (tab === "categories") {
      if (formMode === "category") {
        return <CategoryForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.categories"), form.id ? adminApi.updateCategory : adminApi.createCategory, form)} onCancel={resetForm} saving={saving} t={t} />
      }
      return (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold text-white">{t("admin.tabs.categories")}</h2>
            <button onClick={() => setFormMode("category")} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-500/20">
              <Plus className="w-4 h-4" /> {t("admin.newCategory")}
            </button>
          </div>
          {renderFilters()}
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEndList(e, "category")}>
            <SortableContext items={paginatedData.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {paginatedData.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">{t("admin.noCategories")}</p>}
                {paginatedData.map(cat => (
                  <SortableItem key={cat.id} id={cat.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-xl transition-colors gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-medium text-zinc-100 truncate">{cat.name}</span>
                          {!cat.is_active && <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">{t("admin.labels.inactive")}</span>}
                        </div>
                        <span className="text-xs text-zinc-500 font-mono mt-1 block truncate">{cat.slug}</span>
                      </div>
                      {renderRowActions(cat, "category")}
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Pagination currentPage={filters.page} totalPages={totalPages} onPageChange={p => setFilters(f => ({ ...f, page: p }))} />
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
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold text-white">{t("admin.tabs.collections")}</h2>
            <button onClick={() => setFormMode("collection")} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-500/20">
              <Plus className="w-4 h-4" /> {t("admin.newCollection")}
            </button>
          </div>
          {renderFilters()}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEndList(e, "collection")}>
            <SortableContext items={paginatedData.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {paginatedData.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">{t("admin.noCollections")}</p>}
                {paginatedData.map(col => (
                  <SortableItem key={col.id} id={col.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-xl transition-colors gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-20 h-12 bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-zinc-800">
                          {col.banner_url && <img src={col.banner_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-medium text-zinc-100 truncate">{col.name}</span>
                            {col.is_featured && <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[9px] font-bold uppercase tracking-wider">{t("admin.labels.featured")}</span>}
                            {!col.is_active && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-wider">{t("admin.labels.inactive")}</span>}
                          </div>
                          <span className="text-xs text-zinc-500 font-mono mt-1 block truncate">{col.slug}</span>
                        </div>
                      </div>
                      {renderRowActions(col, "collection")}
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Pagination currentPage={filters.page} totalPages={totalPages} onPageChange={p => setFilters(f => ({ ...f, page: p }))} />
        </div>
      )
    }

    if (tab === "items") {
      if (formMode === "item") {
        return <ItemForm initial={editingItem} categories={categories} artists={artists} onSave={form => handleSave(t("admin.tabs.items"), form.id ? adminApi.updateItem : adminApi.createItem, form)} onCancel={resetForm} saving={saving} t={t} />
      }
      return (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold text-white">{t("admin.tabs.items")}</h2>
            <div className="w-full sm:w-auto flex flex-col items-end gap-1">
              <button onClick={() => setFormMode("item")} disabled={categories.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                <Plus className="w-4 h-4" /> {t("admin.newItem")}
              </button>
              {categories.length === 0 && <span className="text-[10px] text-amber-500">{t("admin.createCategoryFirst")}</span>}
            </div>
          </div>
          {renderFilters(true)}
          
          <div className="space-y-2">
            {paginatedData.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">{t("admin.noItems")}</p>}
            {paginatedData.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-xl transition-colors gap-4 group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center p-1 shrink-0 border border-zinc-800">
                    {item.asset_url && <img src={item.asset_url} alt="" className="max-w-full max-h-full object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-medium text-zinc-100 truncate">{item.name}</span>
                      {item.is_featured && <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[9px] font-bold uppercase tracking-wider">{t("admin.labels.featured")}</span>}
                      {!item.is_active && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-wider">{t("admin.labels.inactive")}</span>}
                      {item.is_limited && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase tracking-wider">{t("admin.labels.limited")} ({item.current_stock}/{item.max_stock})</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">{item.item_type.replace(/_/g, " ")}</span>
                      <span className="text-xs text-zinc-500 truncate">{item.category?.name}</span>
                    </div>
                  </div>
                </div>
                {renderRowActions(item, "item")}
              </div>
            ))}
          </div>
          <Pagination currentPage={filters.page} totalPages={totalPages} onPageChange={p => setFilters(f => ({ ...f, page: p }))} />
        </div>
      )
    }

    if (tab === "artists") {
      if (formMode === "artist") {
        return <ArtistForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.artists"), editingItem ? adminApi.updateArtist : adminApi.createArtist, form)} onCancel={resetForm} saving={saving} t={t} />
      }
      return (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold text-white">{t("admin.tabs.artists")}</h2>
            <button onClick={() => setFormMode("artist")} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-500/20">
              <Plus className="w-4 h-4" /> {t("admin.newArtist")}
            </button>
          </div>
          {renderFilters()}

          <div className="space-y-2">
            {paginatedData.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">{t("admin.noArtists")}</p>}
            {paginatedData.map(artist => (
              <div key={artist.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-xl transition-colors gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-zinc-900 rounded-full shrink-0 border border-zinc-700 overflow-hidden">
                    {artist.avatar_url ? <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" /> : <Palette className="w-5 h-5 m-2.5 text-zinc-600" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium text-zinc-100 truncate">{artist.name}</span>
                      {!artist.listed && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-wider">{t("admin.labels.unlisted")}</span>}
                    </div>
                    <span className="text-xs text-zinc-500 font-mono mt-1 block truncate">@{artist.id}</span>
                  </div>
                </div>
                {renderRowActions(artist, "artist")}
              </div>
            ))}
          </div>
          <Pagination currentPage={filters.page} totalPages={totalPages} onPageChange={p => setFilters(f => ({ ...f, page: p }))} />
        </div>
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.title")}
      maxWidth="max-w-4xl"
      fullscreenMobile
      showMobileGrip
    >
      <div className="flex flex-col h-full bg-zinc-900/95 sm:bg-transparent">
        <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800/80 px-2 sm:px-6 shrink-0 sticky top-0 bg-zinc-900/95 backdrop-blur z-20">
          {TABS.map(tabItem => (
            <button
              key={tabItem.key}
              onClick={() => { setTab(tabItem.key) }}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                tab === tabItem.key ? "text-violet-400 border-violet-500" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <tabItem.icon className={`w-4 h-4 ${tab === tabItem.key ? "text-violet-500" : "text-zinc-500"}`} />
              {t(`admin.tabs.${tabItem.key}`)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6 relative">
          {renderContent()}
        </div>
      </div>
    </Modal>
  )
}