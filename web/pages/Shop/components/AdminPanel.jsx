import { useState, useEffect, useMemo } from "react"
import { Plus, Pencil, Trash2, X, Save, Package, Layers, FolderOpen, Palette, Loader2, Link2, Search, Eye, EyeOff, Star, GripVertical, ChevronDown, ExternalLink, Copy, Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { adminApi } from "../utils/adminApi"
import { notify } from "@components/UI/Notification"
import Modal from "@components/UI/Modal"
import { MINERALS } from "@components/Minerals/MineralRow"

const ITEM_TYPES = ["avatar_decoration", "banner", "profile_effect", "badge", "name_color", "theme"]

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "")
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
        {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text", icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />}
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full py-2 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all ${Icon ? "pl-9 pr-3" : "px-3"}`}
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
      className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
    />
  )
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
    </div>
  )
}

function Toggle({ checked, onChange, label, size = "md" }) {
  const sizes = {
    sm: { track: "w-7 h-4", thumb: "w-3 h-3", translate: "left-[14px]" },
    md: { track: "w-9 h-5", thumb: "w-4 h-4", translate: "left-[18px]" },
  }
  const s = sizes[size]

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative ${s.track} rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 ${s.thumb} rounded-full bg-white shadow-sm transition-all ${checked ? s.translate : "left-0.5"}`} />
      </button>
      {label && <span className="text-sm text-zinc-400">{label}</span>}
    </label>
  )
}

function Badge({ children, variant = "default" }) {
  const variants = {
    default: "bg-zinc-700/50 text-zinc-400",
    violet: "bg-violet-500/15 text-violet-400",
    amber: "bg-amber-500/15 text-amber-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
    red: "bg-red-500/15 text-red-400",
  }

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${variants[variant]}`}>
      {children}
    </span>
  )
}

function AssetPreview({ url, type = "square", size = "md" }) {
  const [error, setError] = useState(false)

  if (!url || error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800/60 rounded-lg border border-zinc-700/40 border-dashed ${
        size === "sm" ? "w-8 h-8" : size === "md" ? "w-12 h-12" : "w-16 h-16"
      }`}>
        <Package className="w-4 h-4 text-zinc-600" />
      </div>
    )
  }

  return (
    <div className={`relative group overflow-hidden rounded-lg bg-zinc-800/40 ${
      type === "banner" ? "w-20 h-12" : size === "sm" ? "w-8 h-8" : size === "md" ? "w-12 h-12" : "w-16 h-16"
    }`}>
      <img
        src={url}
        alt=""
        onError={() => setError(true)}
        className="w-full h-full object-contain"
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <ExternalLink className="w-3.5 h-3.5 text-white" />
      </a>
    </div>
  )
}

function SearchBar({ value, onChange, placeholder, count }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {count !== undefined && (
        <span className="text-xs text-zinc-600 tabular-nums whitespace-nowrap">{count}</span>
      )}
    </div>
  )
}

function QuickToggle({ checked, onChange, icon: Icon, title }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!checked) }}
      title={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
        checked ? "bg-violet-500/20 text-violet-400" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-700/50"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-zinc-600 hover:text-zinc-400 cursor-pointer"
      title="Copy slug"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function DeleteConfirm({ name, onConfirm, onCancel, t }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in duration-150">
      <p className="text-xs text-red-400 flex-1 truncate">
        {t("admin.deleteConfirm", { name })}
      </p>
      <button onClick={onCancel} className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
        {t("admin.cancel")}
      </button>
      <button onClick={onConfirm} className="px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors cursor-pointer">
        {t("admin.delete")}
      </button>
    </div>
  )
}

function FormActions({ onCancel, onSave, saving, disabled, isEdit, t }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
      <button
        onClick={onCancel}
        className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        {t("admin.cancel")}
      </button>
      <button
        onClick={onSave}
        disabled={saving || disabled}
        className="px-5 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isEdit ? t("admin.update") : t("admin.create")}
      </button>
    </div>
  )
}

function FormSection({ title, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      {collapsible ? (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors cursor-pointer"
        >
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <div className="px-4 py-3 bg-zinc-800/30 border-b border-zinc-800">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        </div>
      )}
      {(!collapsible || open) && <div className="p-4 space-y-4">{children}</div>}
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
      <FormSection title={t("admin.fields.basicInfo") || "Basic Info"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("admin.fields.name")}>
            <Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} />
          </Field>
          <Field label={t("admin.fields.slug")}>
            <Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} />
          </Field>
        </div>
        <Field label={t("admin.fields.description")}>
          <Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} />
        </Field>
      </FormSection>

      <FormSection title={t("admin.fields.settings") || "Settings"}>
        <div className="flex items-center justify-between">
          <Field label={t("admin.fields.sortOrder")}>
            <Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} />
          </Field>
          <Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} />
        </div>
      </FormSection>

      <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={saving} disabled={!form.name || !form.slug} isEdit={!!initial?.id} t={t} />
    </div>
  )
}

function CollectionForm({ initial, onSave, onCancel, saving, t }) {
  const [form, setForm] = useState({
    slug: "", name: "", description: "", banner_url: "", accent_color: "#8b5cf6",
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
      <FormSection title={t("admin.fields.basicInfo") || "Basic Info"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("admin.fields.name")}>
            <Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} />
          </Field>
          <Field label={t("admin.fields.slug")}>
            <Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} />
          </Field>
        </div>
        <Field label={t("admin.fields.description")}>
          <Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} />
        </Field>
      </FormSection>

      <FormSection title={t("admin.fields.appearance") || "Appearance"}>
        <div className="flex gap-4">
          <div className="flex-1">
            <Field label={t("admin.fields.bannerUrl")}>
              <Input value={form.banner_url} onChange={v => set("banner_url", v)} placeholder={t("admin.placeholders.url")} />
            </Field>
          </div>
          {form.banner_url && <AssetPreview url={form.banner_url} type="banner" />}
        </div>
        <Field label={t("admin.fields.accentColor")}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.accent_color || "#8b5cf6"}
              onChange={e => set("accent_color", e.target.value)}
              className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
            />
            <Input value={form.accent_color} onChange={v => set("accent_color", v)} placeholder={t("admin.placeholders.color")} />
          </div>
        </Field>
      </FormSection>

      <FormSection title={t("admin.fields.availability") || "Availability"} collapsible defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("admin.fields.availableFrom")}>
            <Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} />
          </Field>
          <Field label={t("admin.fields.availableUntil")}>
            <Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t("admin.fields.settings") || "Settings"}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Field label={t("admin.fields.sortOrder")}>
            <Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} className="w-24" />
          </Field>
          <div className="flex items-center gap-6">
            <Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} />
            <Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label={t("admin.fields.featured")} />
          </div>
        </div>
      </FormSection>

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

  const totalPrice = MINERALS.reduce((sum, m) => sum + (form[`price_${m.key}`] || 0), 0)

  return (
    <div className="space-y-4">
      <FormSection title={t("admin.fields.basicInfo") || "Basic Info"}>
        <div className="flex gap-4">
          <AssetPreview url={form.asset_url} size="lg" />
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.fields.name")}>
                <Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} />
              </Field>
              <Field label={t("admin.fields.slug")}>
                <Input value={form.slug} onChange={v => set("slug", v)} placeholder={t("admin.placeholders.slug")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.fields.type")}>
                <Select value={form.item_type} onChange={v => set("item_type", v)} options={ITEM_TYPES.map(tp => ({ value: tp, label: tp.replace(/_/g, " ") }))} />
              </Field>
              <Field label={t("admin.fields.category")}>
                <Select value={form.category_id} onChange={v => set("category_id", parseInt(v))} options={categories.map(c => ({ value: c.id, label: c.name }))} />
              </Field>
            </div>
          </div>
        </div>
        <Field label={t("admin.fields.assetUrl")}>
          <Input value={form.asset_url} onChange={v => set("asset_url", v)} placeholder={t("admin.placeholders.url")} />
        </Field>
        <Field label={t("admin.fields.description")}>
          <Textarea value={form.description} onChange={v => set("description", v)} placeholder={t("admin.placeholders.description")} rows={2} />
        </Field>
      </FormSection>

      <FormSection title={`${t("admin.fields.prices")} ${totalPrice > 0 ? `· ${totalPrice} total` : ""}`}>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {MINERALS.map(m => (
            <div key={m.key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: m.color }} />
                <span className="text-[11px] text-zinc-400 capitalize font-medium">{m.key}</span>
              </div>
              <Input type="number" value={form[`price_${m.key}`]} onChange={v => set(`price_${m.key}`, parseInt(v) || 0)} />
            </div>
          ))}
        </div>
      </FormSection>

      {allArtists.length > 0 && (
        <FormSection title={t("admin.fields.artists")} collapsible defaultOpen={form.artist_ids.length > 0}>
          <div className="flex flex-wrap gap-2">
            {allArtists.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleArtist(a.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer ${
                  form.artist_ids.includes(a.id)
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                    : "border-zinc-700/60 bg-zinc-800/40 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {a.avatar_url && <img src={a.avatar_url} alt="" className="w-5 h-5 rounded-full" />}
                {a.name}
                {form.artist_ids.includes(a.id) && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </FormSection>
      )}

      <FormSection title={t("admin.fields.stock") || "Stock & Availability"} collapsible defaultOpen={form.is_limited}>
        <div className="flex items-center gap-4 mb-4">
          <Toggle checked={form.is_limited} onChange={v => set("is_limited", v)} label={t("admin.fields.limited")} />
        </div>
        {form.is_limited && (
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("admin.fields.maxStock")}>
              <Input type="number" value={form.max_stock} onChange={v => set("max_stock", v ? parseInt(v) : "")} placeholder={t("admin.placeholders.unlimited")} />
            </Field>
            <Field label={t("admin.fields.currentStock")}>
              <Input type="number" value={form.current_stock} onChange={v => set("current_stock", v ? parseInt(v) : "")} placeholder={t("admin.placeholders.unlimited")} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label={t("admin.fields.availableFrom")}>
            <Input type="datetime-local" value={form.available_from?.slice(0, 16) || ""} onChange={v => set("available_from", v ? new Date(v).toISOString() : "")} />
          </Field>
          <Field label={t("admin.fields.availableUntil")}>
            <Input type="datetime-local" value={form.available_until?.slice(0, 16) || ""} onChange={v => set("available_until", v ? new Date(v).toISOString() : "")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t("admin.fields.settings") || "Settings"}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Field label={t("admin.fields.sortOrder")}>
            <Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} className="w-24" />
          </Field>
          <div className="flex items-center gap-6">
            <Toggle checked={form.is_active} onChange={v => set("is_active", v)} label={t("admin.fields.active")} />
            <Toggle checked={form.is_featured} onChange={v => set("is_featured", v)} label={t("admin.fields.featured")} />
          </div>
        </div>
      </FormSection>

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
      <FormSection title={t("admin.fields.basicInfo") || "Basic Info"}>
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2">
            <AssetPreview url={form.avatar_url} size="lg" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.fields.name")}>
                <Input value={form.name} onChange={v => set("name", v)} placeholder={t("admin.placeholders.name")} />
              </Field>
              <Field label={t("admin.fields.id")} hint={initial?.id ? "(locked)" : ""}>
                <Input value={form.id} onChange={v => set("id", v)} placeholder={t("admin.placeholders.id")} disabled={!!initial?.id} />
              </Field>
            </div>
            <Field label={t("admin.fields.avatarUrl")}>
              <Input value={form.avatar_url} onChange={v => set("avatar_url", v)} placeholder={t("admin.placeholders.url")} />
            </Field>
          </div>
        </div>
        <Field label={t("admin.fields.url")} hint="(portfolio, social, etc)">
          <Input value={form.url} onChange={v => set("url", v)} placeholder={t("admin.placeholders.url")} />
        </Field>
      </FormSection>

      <FormSection title={t("admin.fields.settings") || "Settings"}>
        <div className="flex items-center justify-between">
          <Field label={t("admin.fields.sortOrder")}>
            <Input type="number" value={form.sort_order} onChange={v => set("sort_order", parseInt(v) || 0)} className="w-24" />
          </Field>
          <Toggle checked={form.listed} onChange={v => set("listed", v)} label={t("admin.fields.listed")} />
        </div>
      </FormSection>

      <FormActions onCancel={onCancel} onSave={() => onSave(form)} saving={saving} disabled={!form.name || !form.id} isEdit={!!initial?.id} t={t} />
    </div>
  )
}

function CollectionItemsManager({ collection, allItems, onClose, t }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState("")

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
  const availableItems = allItems.filter(i => !currentItemIds.has(i.id) && (!search || i.name.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {collection.banner_url && <AssetPreview url={collection.banner_url} type="banner" />}
          <div>
            <h3 className="text-sm font-semibold text-white">{collection.name}</h3>
            <p className="text-xs text-zinc-500">{items.length} items</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
      ) : (
        <>
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Current Items</span>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {items.length === 0 && (
                <p className="text-sm text-zinc-600 py-6 text-center border border-dashed border-zinc-800 rounded-lg">
                  {t("admin.collectionItems.empty")}
                </p>
              )}
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-zinc-800/40 hover:bg-zinc-800/60 rounded-lg group transition-colors">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-3.5 h-3.5 text-zinc-700 opacity-0 group-hover:opacity-100 cursor-grab" />
                    <AssetPreview url={item.asset_url} size="sm" />
                    <div>
                      <span className="text-sm text-zinc-300">{item.name}</span>
                      <Badge variant="default">{item.item_type?.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t("admin.collectionItems.addItems")}</span>
            <SearchBar value={search} onChange={setSearch} placeholder="Search items..." count={`${availableItems.length} available`} />
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {availableItems.slice(0, 20).map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item.id)}
                  disabled={adding}
                  className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800/20 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <AssetPreview url={item.asset_url} size="sm" />
                    <div>
                      <span className="text-sm text-zinc-400 group-hover:text-zinc-300">{item.name}</span>
                      <Badge variant="default">{item.item_type?.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-600 group-hover:text-violet-400" />
                </button>
              ))}
              {availableItems.length > 20 && (
                <p className="text-xs text-zinc-600 text-center py-2">+{availableItems.length - 20} more items</p>
              )}
            </div>
          </div>
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

function ListItem({ item, type, onEdit, onDelete, onManage, onQuickToggle, deleteTarget, setDeleteTarget, t }) {
  const isDeleting = deleteTarget?.id === item.id

  if (isDeleting) {
    return <DeleteConfirm name={item.name} onConfirm={() => onDelete(type, item.id, item.name)} onCancel={() => setDeleteTarget(null)} t={t} />
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        {type === "item" && <AssetPreview url={item.asset_url} size="md" />}
        {type === "collection" && <AssetPreview url={item.banner_url} type="banner" />}
        {type === "artist" && <AssetPreview url={item.avatar_url} size="sm" />}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{item.name}</span>
            {type === "item" && <Badge variant="default">{item.item_type?.replace(/_/g, " ")}</Badge>}
            {item.is_featured && <Badge variant="violet">★</Badge>}
            {!item.is_active && <Badge variant="amber">{t("admin.labels.inactive")}</Badge>}
            {!item.listed && type === "artist" && <Badge variant="amber">{t("admin.labels.unlisted")}</Badge>}
            {item.is_limited && <Badge variant="red">{item.current_stock}/{item.max_stock}</Badge>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-zinc-600 truncate">{item.slug || item.id}</span>
            <CopyButton text={item.slug || item.id} />
            {type === "item" && item.category?.name && (
              <span className="text-xs text-zinc-700">· {item.category.name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onQuickToggle && (
          <>
            <QuickToggle
              checked={item.is_active !== false}
              onChange={(v) => onQuickToggle(item, "is_active", v)}
              icon={item.is_active ? Eye : EyeOff}
              title={t("admin.fields.active")}
            />
            <QuickToggle
              checked={item.is_featured}
              onChange={(v) => onQuickToggle(item, "is_featured", v)}
              icon={Star}
              title={t("admin.fields.featured")}
            />
          </>
        )}
        {type === "collection" && onManage && (
          <button onClick={() => onManage(item)} className="p-1.5 text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 rounded-md cursor-pointer" title={t("admin.labels.manageItems")}>
            <Link2 className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onEdit(item)} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/50 rounded-md cursor-pointer">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function AdminPanel({ isOpen, onClose }) {
  const { t } = useTranslation("shop")

  const [tab, setTab] = useState("items")
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])
  const [items, setItems] = useState([])
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
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

  async function handleQuickToggle(item, field, value) {
    const type = tab.slice(0, -1)
    try {
      const updateFn = {
        item: adminApi.updateItem,
        collection: adminApi.updateCollection,
        category: adminApi.updateCategory,
        artist: adminApi.updateArtist,
      }[type]

      await updateFn({ id: item.id, [field]: value })
      await loadAll()
    } catch (e) {
      notify(e.message, "error")
    }
  }

  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase()
    const filterFn = (item) => !search || item.name?.toLowerCase().includes(searchLower) || item.slug?.toLowerCase().includes(searchLower)

    return {
      items: items.filter(filterFn),
      collections: collections.filter(filterFn),
      categories: categories.filter(filterFn),
      artists: artists.filter(filterFn),
    }
  }, [items, collections, categories, artists, search])

  function renderContent() {
    if (loading) {
      return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>
    }

    if (managingCollection) {
      return <CollectionItemsManager collection={managingCollection} allItems={items} onClose={() => setManagingCollection(null)} t={t} />
    }

    if (formMode) {
      const forms = {
        category: <CategoryForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.categories"), form.id ? adminApi.updateCategory : adminApi.createCategory, form)} onCancel={resetForm} saving={saving} t={t} />,
        collection: <CollectionForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.collections"), form.id ? adminApi.updateCollection : adminApi.createCollection, form)} onCancel={resetForm} saving={saving} t={t} />,
        item: <ItemForm initial={editingItem} categories={categories} artists={artists} onSave={form => handleSave(t("admin.tabs.items"), form.id ? adminApi.updateItem : adminApi.createItem, form)} onCancel={resetForm} saving={saving} t={t} />,
        artist: <ArtistForm initial={editingItem} onSave={form => handleSave(t("admin.tabs.artists"), editingItem ? adminApi.updateArtist : adminApi.createArtist, form)} onCancel={resetForm} saving={saving} t={t} />,
      }
      return forms[formMode]
    }

    const config = {
      items: { data: filteredData.items, type: "item", empty: "admin.noItems", new: "admin.newItem", disabled: categories.length === 0, hint: categories.length === 0 ? t("admin.createCategoryFirst") : null },
      collections: { data: filteredData.collections, type: "collection", empty: "admin.noCollections", new: "admin.newCollection" },
      categories: { data: filteredData.categories, type: "category", empty: "admin.noCategories", new: "admin.newCategory" },
      artists: { data: filteredData.artists, type: "artist", empty: "admin.noArtists", new: "admin.newArtist" },
    }[tab]

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder={`Search ${tab}...`} count={`${config.data.length} ${tab}`} />
          <button
            onClick={() => setFormMode(config.type)}
            disabled={config.disabled}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t(config.new)}
          </button>
        </div>

        {config.hint && <p className="text-xs text-zinc-600">{config.hint}</p>}

        {config.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
              {tab === "items" && <Package className="w-5 h-5 text-zinc-600" />}
              {tab === "collections" && <Layers className="w-5 h-5 text-zinc-600" />}
              {tab === "categories" && <FolderOpen className="w-5 h-5 text-zinc-600" />}
              {tab === "artists" && <Palette className="w-5 h-5 text-zinc-600" />}
            </div>
            <p className="text-sm text-zinc-500">{t(config.empty)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {config.data.map(item => (
              <ListItem
                key={item.id}
                item={item}
                type={config.type}
                onEdit={(item) => { setEditingItem(item); setFormMode(config.type) }}
                onDelete={handleDelete}
                onManage={tab === "collections" ? setManagingCollection : null}
                onQuickToggle={handleQuickToggle}
                deleteTarget={deleteTarget}
                setDeleteTarget={setDeleteTarget}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    )
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
      <div className="flex border-b border-zinc-800 px-2 bg-zinc-900/50">
        {TABS.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => { setTab(tabItem.key); resetForm(); setManagingCollection(null); setSearch("") }}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              tab === tabItem.key ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <tabItem.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t(`admin.tabs.${tabItem.key}`)}</span>
            {tab === tabItem.key && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="p-5 min-h-[400px]">
        {renderContent()}
      </div>
    </Modal>
  )
}