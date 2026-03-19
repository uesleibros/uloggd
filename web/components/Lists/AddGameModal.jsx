import { useState, useEffect } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { useGameSearch } from "#hooks/useGameSearch"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { GameSearchInput, GameSearchResults } from "@components/Game/GameSearchInput"
import { Plus, Check } from "lucide-react"

export default function AddGameModal({ isOpen, onClose, listId, existingSlugs = [], onAdded }) {
  const { t } = useTranslation()
  const { query, setQuery, results, searching, reset } = useGameSearch({ enabled: isOpen })
  const [adding, setAdding] = useState(null)
  const [recentlyAdded, setRecentlyAdded] = useState([])

  useEffect(() => {
    if (isOpen) {
      reset()
      setRecentlyAdded([])
    }
  }, [isOpen, reset])

  async function handleAdd(game) {
    setAdding(game.slug)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/lists/@me/addItem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ listId, gameId: game.id, gameSlug: game.slug }),
      })

      if (!res.ok) throw new Error()
      const item = await res.json()
      onAdded(item)
      setRecentlyAdded(prev => [...prev, game.slug])
    } catch {
    } finally {
      setAdding(null)
    }
  }

  const allAdded = [...existingSlugs, ...recentlyAdded]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("lists.addGame.title")}
      maxWidth="max-w-lg"
      fullscreenMobile
      showMobileGrip
    >
      <div className="flex flex-col h-full">
        <div className="p-5 pb-4 sm:p-6 sm:pb-4">
          <GameSearchInput
            query={query}
            onQueryChange={setQuery}
            onClear={reset}
            placeholder={t("lists.addGame.searchPlaceholder")}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-5 sm:pb-6 min-h-0 max-h-[55vh] md:max-h-96">
          <GameSearchResults
            results={results}
            searching={searching}
            query={query}
            emptyMessage={t("lists.addGame.noResults")}
            typeToSearchMessage={t("lists.addGame.typeToSearch")}
            renderActions={(game) => {
              const alreadyAdded = allAdded.includes(game.slug)
              const isAdding = adding === game.slug

              if (alreadyAdded) {
                return (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 px-2.5 py-2 sm:py-1.5 bg-emerald-500/10 rounded-lg">
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("lists.addGame.added")}</span>
                  </span>
                )
              }

              return (
                <button
                  onClick={() => handleAdd(game)}
                  disabled={isAdding}
                  className="px-3 py-2 sm:py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isAdding ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{t("lists.addGame.add")}</span>
                </button>
              )
            }}
          />
        </div>

        {recentlyAdded.length > 0 && (
          <div className="px-5 sm:px-6 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              {t("lists.addGame.addedCount", { count: recentlyAdded.length })}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
