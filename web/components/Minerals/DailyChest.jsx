import { useState, useEffect } from "react"
import { Lock, Sparkles, Clock, Gift } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { notify } from "@components/UI/Notification"
import ChestOpenModal from "./ChestOpenModal"
import Chest3DCanvas from "./Chest3D"

export default function DailyChest() {
  const { t } = useTranslation("minerals")
  const { user } = useAuth()
  const [canOpen, setCanOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [rewards, setRewards] = useState(null)
  const [chestState, setChestState] = useState("idle")

  useEffect(() => {
    if (!user) return
    fetchStatus()
  }, [user])

  useEffect(() => {
    if (timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanOpen(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft])

  async function fetchStatus() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch("/api/chest/@me/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCanOpen(data.canOpen)
      if (!data.canOpen && data.secondsLeft) setTimeLeft(data.secondsLeft)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenChest() {
    if (!canOpen || opening) return
    setOpening(true)

    setChestState("shaking")
    await new Promise((r) => setTimeout(r, 1400))

    setChestState("opening")
    await new Promise((r) => setTimeout(r, 1000))

    setChestState("burst")
    await new Promise((r) => setTimeout(r, 800))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch("/api/chest/@me/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        notify(
          t(`dailyChest.errors.${data.error}`) || t("dailyChest.error"),
          "error"
        )
        setChestState("idle")
        setOpening(false)
        return
      }
      setRewards(data.rewards)
      await new Promise((r) => setTimeout(r, 300))
      setShowModal(true)
      setCanOpen(false)
      setTimeLeft(86400)
    } catch (e) {
      console.error(e)
      notify(t("dailyChest.error"), "error")
    } finally {
      setChestState("idle")
      setOpening(false)
    }
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="relative mb-10">
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-8">
          <div className="flex items-center gap-8 animate-pulse">
            <div className="w-32 h-32 bg-zinc-800 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-zinc-800 rounded w-1/3" />
              <div className="h-4 bg-zinc-800 rounded w-2/3" />
              <div className="h-10 bg-zinc-800 rounded w-32 mt-4" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative mb-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-8">
          {canOpen && chestState === "idle" && (
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          )}

          <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="relative flex-shrink-0">
              <Chest3DCanvas
                canOpen={canOpen}
                chestState={chestState}
                onClick={handleOpenChest}
              />

              {canOpen && chestState === "idle" && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 flex items-center justify-center animate-bounce">
                      <span className="text-white font-black text-xs">!</span>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                  </div>
                </div>
              )}

              {!canOpen && !opening && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-zinc-800/90 border-2 border-zinc-600 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <Lock className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <Gift
                  className={`w-5 h-5 ${canOpen ? "text-amber-400" : "text-zinc-500"}`}
                />
                <h3 className="text-xl font-bold text-white">
                  {t("dailyChest.title")}
                </h3>
                {canOpen && (
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full">
                    {t("dailyChest.available")}
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-400 mb-5 max-w-sm">
                {t("dailyChest.description")}
              </p>

              {canOpen ? (
                <button
                  onClick={handleOpenChest}
                  disabled={opening}
                  className={`
                    inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-bold uppercase tracking-wide
                    rounded-xl transition-all duration-200 cursor-pointer
                    ${
                      opening
                        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                        : "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-amber-950 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-95"
                    }
                  `}
                >
                  {opening ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />
                      {t("dailyChest.opening")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t("dailyChest.open")}
                    </>
                  )}
                </button>
              ) : (
                <div className="inline-flex items-center gap-3 px-5 py-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      {t("dailyChest.nextIn")}
                    </span>
                    <span className="text-lg font-mono font-bold text-white tabular-nums">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChestOpenModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        rewards={rewards}
        onMineralsCollected={() => {
          window.dispatchEvent(new CustomEvent("minerals-updated"))
        }}
      />
    </>
  )
}
