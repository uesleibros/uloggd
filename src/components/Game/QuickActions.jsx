import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../../hooks/useAuth"
import { supabase } from "../../../lib/supabase"
import { createPortal } from "react-dom"

const STATUS_OPTIONS = [
  { id: "played", label: "Jogado", sub: "Nada específico", color: "bg-zinc-500" },
  { id: "completed", label: "Completo", sub: "Zerou o objetivo principal", color: "bg-emerald-500" },
  { id: "retired", label: "Aposentado", sub: "Terminou um jogo sem final", color: "bg-blue-500" },
  { id: "shelved", label: "Na prateleira", sub: "Não terminou mas pode voltar", color: "bg-amber-500" },
  { id: "abandoned", label: "Abandonado", sub: "Não terminou e não vai voltar", color: "bg-red-500" },
]

function StatusDropdown({ status, onSelect, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[10001]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[calc(100vw-2rem)] sm:max-w-sm bg-zinc-900 border border-zinc-700 border-b-0 sm:border-b rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>
        <div className="p-4 border-b border-zinc-700">
          <h4 className="text-sm font-semibold text-white">Definir status</h4>
          <p className="text-xs text-zinc-500 mt-0.5">Como você finalizou esse jogo?</p>
        </div>
        <div className="p-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left cursor-pointer transition-all duration-200 ${
                status === s.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0 ${s.color} ${
                status === s.id ? "ring-2 ring-offset-1 ring-offset-zinc-900 ring-white/20" : ""
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.sub}</p>
              </div>
              {status === s.id && (
                <svg className="w-4 h-4 text-white ml-auto mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
          {status && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full px-3 py-2.5 mt-1 rounded-lg text-left text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 cursor-pointer transition-all"
            >
              Remover status
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function ActionButton({ active, onClick, icon, label, activeClass = "bg-white text-black" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
        active
          ? activeClass
          : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default function QuickActions({ game }) {
  const { user } = useAuth()
  const [state, setState] = useState({
    status: null,
    playing: false,
    backlog: false,
    wishlist: false,
    liked: false,
  })
  const [loading, setLoading] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [updating, setUpdating] = useState(null)

  const fetchState = useCallback(async () => {
    if (!user || !game?.id) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/user-games?action=get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ gameId: game.id }),
      })

      if (res.ok) {
        const data = await res.json()
        setState({
          status: data.status || null,
          playing: data.playing || false,
          backlog: data.backlog || false,
          wishlist: data.wishlist || false,
          liked: data.liked || false,
        })
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [user, game?.id])

  useEffect(() => { fetchState() }, [fetchState])

  async function toggle(field, value) {
    if (!user || updating) return
    setUpdating(field)

    const prev = { ...state }
    setState(s => ({ ...s, [field]: value }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState(prev); return }

      const res = await fetch("/api/user-games?action=update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          gameId: game.id,
          gameSlug: game.slug,
          field,
          value,
        }),
      })

      if (!res.ok) setState(prev)
    } catch {
      setState(prev)
    } finally {
      setUpdating(null)
    }
  }

  if (!user) return null
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-20 bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const statusConfig = STATUS_OPTIONS.find(s => s.id === state.status)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowStatus(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
            state.status
              ? `${statusConfig?.color || "bg-zinc-500"} text-white`
              : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${state.status ? "bg-white/30" : "bg-zinc-600"}`} />
          {statusConfig?.label || "Status"}
          <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <ActionButton
          active={state.playing}
          onClick={() => toggle("playing", !state.playing)}
          icon={<svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
          label="Jogando"
        />

        <ActionButton
          active={state.backlog}
          onClick={() => toggle("backlog", !state.backlog)}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Backlog"
        />

        <ActionButton
          active={state.wishlist}
          onClick={() => toggle("wishlist", !state.wishlist)}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21" />
            </svg>
          }
          label="Wishlist"
        />

        <button
          type="button"
          onClick={() => toggle("liked", !state.liked)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-zinc-800/50"
        >
          <svg
            className={`w-4 h-4 transition-all duration-200 ${state.liked ? "text-red-500 scale-110" : "text-zinc-600"}`}
            fill={state.liked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={state.liked ? 0 : 1.5}
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <span className={state.liked ? "text-red-400" : "text-zinc-500"}>Curtir</span>
        </button>
      </div>

      {showStatus && (
        <StatusDropdown
          status={state.status}
          onSelect={(val) => {
            toggle("status", val)
            setShowStatus(false)
          }}
          onClose={() => setShowStatus(false)}
        />
      )}
    </>
  )
}
