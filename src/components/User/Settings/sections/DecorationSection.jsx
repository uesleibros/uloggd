import { useState } from "react"
import { X, Check } from "lucide-react"
import SettingsSection from "../ui/SettingsSection"
import SaveActions from "../ui/SaveActions"
import AvatarWithDecoration from "../../AvatarWithDecoration"
import { AVATAR_DECORATIONS } from "../../../../../data/avatarDecorations"

const CATEGORIES = ["todas", ...new Set(AVATAR_DECORATIONS.map(d => d.category))]

function CheckMark() {
  return (
    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
      <Check className="w-2 h-2 text-black" strokeWidth={3} />
    </div>
  )
}

export default function DecorationSection({ user, selected, onSelect, onSave, onReset, saving, isDirty }) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("todas")

  const filtered = AVATAR_DECORATIONS.filter(d => {
    const matchCat = category === "todas" || d.category === category
    const matchSearch = (d.label || d.name || "").toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const itemClass = (active) =>
    `relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
      active ? "border-white bg-zinc-800" : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800"
    }`

  return (
    <SettingsSection title="Decoração do Avatar" description="Escolha uma decoração para o seu avatar.">
      <div className="flex items-center justify-center p-6 bg-zinc-900/50 rounded-lg border border-zinc-700/50 mb-5">
        <AvatarWithDecoration src={user.avatar} alt={user.username} decoration={selected} size="2xl" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Pesquisar decoração..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 capitalize"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat} className="capitalize">{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 max-h-72 overflow-y-auto pr-1">
        <button onClick={() => onSelect(null)} className={itemClass(selected === null)}>
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
            <X className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-[10px] text-zinc-400 text-center leading-tight">Nenhuma</span>
          {selected === null && <CheckMark />}
        </button>

        {filtered.map(d => {
          const active = selected === d.id
          const label = d.label || d.name || ""
          return (
            <button key={d.id} onClick={() => onSelect(d.id)} title={label} className={itemClass(active)}>
              <img src={d.url} alt={label} className="w-10 h-10 object-contain" />
              <span className="text-[10px] text-zinc-400 text-center leading-tight line-clamp-1 w-full">{label}</span>
              {active && <CheckMark />}
            </button>
          )
        })}
      </div>

      <SaveActions onSave={onSave} onReset={onReset} saving={saving} isDirty={isDirty} />
    </SettingsSection>
  )
}