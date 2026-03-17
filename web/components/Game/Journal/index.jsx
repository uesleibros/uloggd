import { useState, useEffect, useCallback, useRef } from "react"
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
  const [loading, setLoading] = useState(true)
  const [selectedJourney, setSelectedJourney] = useState(null)
  const mountedRef = useRef(true)

  const fetchJourneys = useCallback(async () => {
    if (!user || !game?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !mountedRef.current) return

      const res = await fetch(`/api/journeys/@me/list?gameId=${game.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!mountedRef.current) return

      if (res.ok) {
        const data = await res.json()
        const list = data.journeys || []
        setJourneys(list)
        setSelectedJourney((prev) => {
          if (!prev) return list[0] || null
          return list.find(j => j.id === prev.id) || list[0] || null
        })
      }
    } catch {
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [user, game?.id])

  useEffect(() => {
    mountedRef.current = true
    fetchJourneys()
    return () => { mountedRef.current = false }
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

  if (loading) {
    return (
      <div className="h-10 bg-zinc-800 rounded-xl animate-pulse" />
    )
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
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white border border-zinc-700 hover:border-zinc-600"
        >
          <Plus className="w-4 h-4" />
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
