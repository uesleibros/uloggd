import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import { emitJournalUpdate } from "#hooks/useJournalEvents"
import Modal from "@components/UI/Modal"
import { JournalModal } from "./JournalModal"
import { JournalCard } from "./JournalCard"

function JourneySelector({ journeys, selectedId, onSelect, onNew }) {
  const { t } = useTranslation("journal")

  if (journeys.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {journeys.map((j) => (
        <button
          key={j.id}
          type="button"
          onClick={() => onSelect(j)}
          className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
            selectedId === j.id
              ? "bg-white text-black"
              : "bg-zinc-800/50 text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-600"
          }`}
        >
          {j.title}
        </button>
      ))}
      <button
        type="button"
        onClick={onNew}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-white border border-dashed border-zinc-700 hover:border-zinc-500 cursor-pointer transition-all duration-200"
      >
        <Plus className="w-3 h-3" />
        {t("selector.new")}
      </button>
    </div>
  )
}

export default function JournalButton({ game }) {
  const { user } = useAuth()
  const { t } = useTranslation("journal")
  const [showModal, setShowModal] = useState(false)
  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedJourney, setSelectedJourney] = useState(null)

	const fetchJourneys = useCallback(
	  async (signal) => {
	    if (!user || !game?.id) return
	    setLoading(true)
	    try {
	      const {
	        data: { session },
	      } = await supabase.auth.getSession()
	      if (!session || signal?.aborted) return
	
	      const res = await fetch(`/api/journeys/@me/list?gameId=${game.id}`, {
	        headers: { Authorization: `Bearer ${session.access_token}` },
	        signal,
	      })
	
	      if (res.ok && !signal?.aborted) {
	        const data = await res.json()
	        setJourneys(data.journeys || [])
	        setSelectedJourney((prev) => {
	          if (!prev) return data.journeys?.[0] ?? null
	          return data.journeys?.find(j => j.id === prev.id) || data.journeys?.[0] || null
	        })
	      }
	    } catch (e) {
	      if (e?.name === "AbortError") return
	    } finally {
	      if (!signal?.aborted) setLoading(false)
	    }
	  },
	  [user?.id, game?.id],
	)

  useEffect(() => {
    const ac = new AbortController()
    fetchJourneys(ac.signal)
    return () => ac.abort()
  }, [fetchJourneys])

  if (!user) return null

  const hasJourneys = journeys.length > 0
  const activeJourney = selectedJourney || journeys[0] || null

  function openModal(journey = activeJourney) {
    setSelectedJourney(journey)
    setShowModal(true)
  }

  function openNewJourney() {
    setSelectedJourney(null)
    setShowModal(true)
  }

  function handleClose() {
    setShowModal(false)
    fetchJourneys()
    emitJournalUpdate()
  }

  function handleDeleted() {
    setSelectedJourney(null)
    fetchJourneys()
    emitJournalUpdate()
  }

  return (
    <>
      {hasJourneys ? (
        <div className="space-y-3">
          {journeys.length > 1 && (
            <JourneySelector
              journeys={journeys}
              selectedId={activeJourney?.id}
              onSelect={(j) => setSelectedJourney(j)}
              onNew={openNewJourney}
            />
          )}
          <JournalCard
            journey={activeJourney}
            onEdit={() => openModal(activeJourney)}
          />
          {journeys.length === 1 && (
            <button
              type="button"
              onClick={openNewJourney}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("button.createAnother")}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => openModal(null)}
          disabled={loading}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          {t("button.create")}
        </button>
      )}

      <Modal
        isOpen={showModal}
        onClose={handleClose}
        raw
        fullscreenMobile
        className="w-full md:max-w-2xl"
      >
        {showModal && (
          <JournalModal
            game={game}
            existingJourney={selectedJourney}
            onClose={handleClose}
            onDeleted={handleDeleted}
          />
        )}
      </Modal>
    </>
  )
}

