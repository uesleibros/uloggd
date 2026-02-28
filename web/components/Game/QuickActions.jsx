import { useState, useEffect, useCallback, useRef } from "react"
import { Check, ChevronDown, Play, Clock, Gift, Heart, List } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { useMyLibrary } from "#hooks/useMyLibrary"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import AddToListModal from "@components/Lists/AddToListModal"
import { STATUS_OPTIONS, GAME_STATUS } from "#constants/game"

function StatusDropdownContent({ status, onSelect }) {
  const { t } = useTranslation("quickActions")

  return (
    <>
      <div className="px-4 pt-3 pb-3 sm:p-4 border-b border-zinc-700">
        <h4 className="text-sm font-semibold text-white">{t("statusModal.title")}</h4>
        <p className="text-xs text-zinc-500 mt-0.5">{t("statusModal.subtitle")}</p>
      </div>
      <div className="p-2 max-h-[60vh] overflow-y-auto overscroll-contain">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`w-full flex items-start gap-3 px-3 py-3.5 rounded-lg text-left cursor-pointer transition-all duration-200 active:bg-zinc-800 ${
              status === s.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0 ${s.color} ${
              status === s.id ? "ring-2 ring-offset-1 ring-offset-zinc-900 ring-white/20" : ""
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{t(`status.${s.id}.label`)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t(`status.${s.id}.sub`)}</p>
            </div>
            {status === s.id && <Check className="w-4 h-4 text-white ml-auto mt-0.5 flex-shrink-0" />}
          </button>
        ))}
        {status && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="w-full px-3 py-3 mt-1 rounded-lg text-left text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 active:bg-zinc-800 cursor-pointer transition-all"
          >
            {t("removeStatus")}
          </button>
        )}
      </div>
    </>
  )
}

function ActionButton({ active, onClick, icon, label, activeClass = "bg-white text-black", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? activeClass
          : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 active:bg-zinc-700 border border-zinc-700"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default function QuickActions({ game }) {
  const { t } = useTranslation("quickActions")
  const { user } = useAuth()
  const { refresh } = useMyLibrary()
  const [state, setState] = useState({
    status: null,
    playing: false,
    backlog: false,
    wishlist: false,
    liked: false,
  })
  const [loading, setLoading] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [showListModal, setShowListModal] = useState(false)
  const [updating, setUpdating] = useState(null)
  const fetchedRef = useRef(null)

  useEffect(() => {
    if (!user || !game?.id) return
    if (fetchedRef.current === game.id) return

    let cancelled = false

    async function fetchState() {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || cancelled) return

        const res = await fetch(`/api/userGames/@me/get?gameId=${game.id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          }
        })

        if (res.ok && !cancelled) {
          const data = await res.json()
          setState({
            status: data.status || null,
            playing: data.playing || false,
            backlog: data.backlog || false,
            wishlist: data.wishlist || false,
            liked: data.liked || false,
          })
          fetchedRef.current = game.id
        }
      } catch {} finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchState()
    return () => { cancelled = true }
  }, [user?.id, game?.id])

  async function toggle(field, value) {
    if (!user || updating) return
    setUpdating(field)

    const prev = { ...state }
    setState(s => ({ ...s, [field]: value }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState(prev); return }

      const res = await fetch("/api/userGames/@me/update", {
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

      if (res.ok) {
        refresh()
      } else {
        setState(prev)
      }
    } catch {
      setState(prev)
    } finally {
      setUpdating(null)
    }
  }

  if (!user) return null
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 w-24 bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const statusConfig = GAME_STATUS[state.status]

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setShowStatus(true)}
          disabled={!!updating}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed ${
            state.status
              ? `${statusConfig?.color || "bg-zinc-500"} text-white active:opacity-80`
              : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 active:bg-zinc-700 border border-zinc-700"
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${state.status ? "bg-white/30" : "bg-zinc-600"}`} />
          {state.status ? t(`status.${state.status}.label`) : t("statusButton")}
          <ChevronDown className="w-3.5 h-3.5 opacity-50 -mr-0.5" />
        </button>

        <ActionButton
          active={state.playing}
          onClick={() => toggle("playing", !state.playing)}
          disabled={!!updating}
          icon={<Play className="w-3.5 h-3.5 flex-shrink-0 fill-current" />}
          label={t("playing")}
        />

        <ActionButton
          active={state.backlog}
          onClick={() => toggle("backlog", !state.backlog)}
          disabled={!!updating}
          icon={<Clock className="w-3.5 h-3.5 flex-shrink-0" />}
          label={t("backlog")}
        />

        <ActionButton
          active={state.wishlist}
          onClick={() => toggle("wishlist", !state.wishlist)}
          disabled={!!updating}
          icon={<Gift className="w-3.5 h-3.5 flex-shrink-0" />}
          label={t("wishlist")}
        />

        <ActionButton
          active={false}
          onClick={() => setShowListModal(true)}
          disabled={!!updating}
          icon={<List className="w-3.5 h-3.5 flex-shrink-0" />}
          label={t("list")}
        />

        <button
          type="button"
          onClick={() => toggle("liked", !state.liked)}
          disabled={!!updating}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 select-none hover:bg-zinc-800/50 active:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Heart
            className={`w-4.5 h-4.5 transition-all duration-200 ${state.liked ? "text-red-500 scale-110 fill-current" : "text-zinc-600"}`}
          />
          <span className={state.liked ? "text-red-400" : "text-zinc-500"}>{t("like")}</span>
        </button>
      </div>

      <Modal
        isOpen={showStatus}
        onClose={() => setShowStatus(false)}
        showCloseButton={false}
        maxWidth="max-w-sm"
        fullscreenMobile
        showMobileGrip
        className="!rounded-t-2xl md:!rounded-xl"
      >
        <StatusDropdownContent
          status={state.status}
          onSelect={(val) => {
            toggle("status", val)
            setShowStatus(false)
          }}
        />
      </Modal>

      <AddToListModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        game={game}
      />
    </>
  )
}
