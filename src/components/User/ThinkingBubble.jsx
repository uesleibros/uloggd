import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { supabase } from "../../../lib/supabase"
import { notify } from "../UI/Notification"

const MAX_THINKING = 50

function ThinkingModal({ currentThinking, onClose, onSave }) {
  const [text, setText] = useState(currentThinking || "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.body.style.overflow = ""
      document.body.style.paddingRight = ""
    }
  }, [])

  async function save(value) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch("/api/user?action=thinking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ thinking: value }),
      })
      if (res.ok) {
        const data = await res.json()
        notify("Pensamento atualizado.")
        onSave(data.thinking)
        onClose()
      }
    } catch {
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">Pensamento</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_THINKING))}
              placeholder="No que você está pensando..."
              rows={3}
              maxLength={MAX_THINKING}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
              autoFocus
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${text.length >= MAX_THINKING ? "text-red-400" : "text-zinc-600"}`}>
                {text.length}/{MAX_THINKING}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {currentThinking && (
              <button onClick={() => save(null)} disabled={saving} className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all cursor-pointer disabled:opacity-50">
                Remover
              </button>
            )}
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all cursor-pointer">
              Cancelar
            </button>
            <button onClick={() => save(text.trim() || null)} disabled={saving || (!text.trim() && !currentThinking)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all cursor-pointer disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function ThinkingBubble({ text, isOwnProfile, onSave }) {
  const [modalOpen, setModalOpen] = useState(false)

  if (!text && !isOwnProfile) return null

  return (
    <>
      <style>{`
        @keyframes tbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes tbGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(99,102,241,0.08), 0 4px 16px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 14px rgba(99,102,241,0.15), 0 4px 20px rgba(0,0,0,0.4); }
        }
        @keyframes tbPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      {text ? (
        <div style={{ animation: 'tbFloat 4s ease-in-out infinite' }}>
          <div className="group">
            <div
              className="relative bg-zinc-800/95 backdrop-blur-sm border border-zinc-600/80 rounded-[20px] px-3.5 py-2 min-w-[150px] max-w-[200px]"
              style={{ animation: 'tbGlow 3s ease-in-out infinite' }}
            >
              <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-zinc-500/30 to-transparent rounded-full" />
              <p className="text-[13px] text-zinc-100 break-words leading-snug text-center font-medium line-clamp-3">
                {text}
              </p>
              {isOwnProfile && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg z-20"
                >
                  <svg className="w-3 h-3 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="pl-3 mt-1 space-y-[3px]">
              <div className="w-3 h-3 bg-zinc-800/95 border border-zinc-600/80 rounded-full shadow-md" />
              <div className="w-2 h-2 bg-zinc-800/90 border border-zinc-600/60 rounded-full shadow-sm opacity-70" />
              <div className="w-1.5 h-1.5 bg-zinc-800/80 border border-zinc-600/40 rounded-full opacity-40" />
            </div>
          </div>
        </div>
      ) : isOwnProfile ? (
        <div>
          <button
            onClick={() => setModalOpen(true)}
            className="group relative bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 border-dashed rounded-2xl px-3 py-2 shadow-lg transition-all cursor-pointer"
            style={{ animation: 'tbPulse 3s ease-in-out infinite' }}
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <svg className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-medium transition-colors">Pensamento...</span>
            </div>
          </button>
          <div className="pl-3 mt-1 space-y-[3px]">
            <div className="w-2.5 h-2.5 bg-zinc-800/60 border border-zinc-700 border-dashed rounded-full" />
            <div className="w-1.5 h-1.5 bg-zinc-800/40 border border-zinc-700/60 border-dashed rounded-full" />
          </div>
        </div>
      ) : null}

      {modalOpen && (
        <ThinkingModal
          currentThinking={text}
          onClose={() => setModalOpen(false)}
          onSave={(newThinking) => {
            onSave(newThinking)
            setModalOpen(false)
          }}
        />
      )}
    </>
  )
}