import { useState, useEffect, useCallback } from "react"
import { Lock, Clock, Gift } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { notify } from "@components/UI/Notification"
import ChestOpenModal from "./ChestOpenModal"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0")
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")
  const s = String(seconds % 60).padStart(2, "0")
  return `${h}:${m}:${s}`
}

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

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch("/api/chest/@me/status", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error()

      const data = await res.json()
      setCanOpen(data.canOpen)

      if (!data.canOpen && data.secondsLeft > 0) {
        setTimeLeft(data.secondsLeft)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchStatus()
  }, [user, fetchStatus])

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

  async function handleOpenChest() {
    if (!canOpen || opening) return

    setOpening(true)

    const animate = async () => {
      setChestState("shaking")
      await sleep(800)
      setChestState("opening")
      await sleep(400)
      setChestState("burst")
      await sleep(400)
    }

    const fetchRewards = async () => {
      const token = await getToken()
      if (!token) return null

      const res = await fetch("/api/chest/@me/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (!res.ok) throw data

      return data.rewards
    }

    try {
      const [, result] = await Promise.all([animate(), fetchRewards()])

      setRewards(result)
      setShowModal(true)
      setCanOpen(false)
      await fetchStatus()
    } catch (err) {
      const msg = err?.error
        ? t(`dailyChest.errors.${err.error}`) || t("dailyChest.error")
        : t("dailyChest.error")
      notify(msg, "error")
    } finally {
      setChestState("idle")
      setOpening(false)
    }
  }

  const isChestOpen = chestState === "opening" || chestState === "burst"

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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-800/90 border border-zinc-700/50 p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative flex flex-col sm:flex-row items-center gap-8">
            <div className="relative">
              <button
                onClick={handleOpenChest}
                disabled={!canOpen || opening}
                className={`relative group ${canOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <div className={`relative w-36 h-36 ${chestState === "shaking" ? "animate-clash-shake" : ""}`}>
                  {canOpen && chestState === "idle" && (
                    <>
                      <div className="absolute -inset-3 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                      <div className="absolute -inset-1 bg-gradient-to-t from-amber-500/30 to-transparent rounded-2xl animate-pulse" />
                    </>
                  )}

                  {chestState === "opening" && (
                    <div className="absolute -inset-6 bg-amber-400/30 rounded-full blur-2xl animate-pulse" />
                  )}

                  {chestState === "burst" && (
                    <>
                      <div className="absolute -inset-8 bg-amber-400/40 rounded-full blur-3xl animate-ping" />
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-1/2 left-1/2 w-2 h-2 bg-amber-400 rounded-full animate-particle"
                          style={{ "--angle": `${i * 30}deg`, animationDelay: `${i * 40}ms` }}
                        />
                      ))}
                    </>
                  )}

                  <img
                    src={isChestOpen ? "/chest/open.png" : "/chest/idle.png"}
                    alt="Daily Chest"
                    className={`
                      relative w-full h-full object-contain drop-shadow-2xl
                      transition-all duration-300
                      ${canOpen && chestState === "idle" ? "group-hover:scale-105 group-hover:drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]" : ""}
                      ${!canOpen ? "grayscale opacity-60" : ""}
                    `}
                    draggable={false}
                  />

                  {!canOpen && !opening && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-zinc-900/90 border-2 border-zinc-600 flex items-center justify-center backdrop-blur-sm shadow-xl">
                        <Lock className="w-5 h-5 text-zinc-400" />
                      </div>
                    </div>
                  )}

                  {canOpen && chestState === "idle" && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce shadow-lg shadow-amber-500/50" />
                    </div>
                  )}
                </div>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  <h3 className="text-2xl font-bold text-white">
                    {t("dailyChest.title")}
                  </h3>
                </div>
                {canOpen && (
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full animate-pulse">
                    {t("dailyChest.available")}
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-400 mb-5 max-w-md leading-relaxed">
                {t("dailyChest.description")}
              </p>

              {canOpen ? (
                <button
                  onClick={handleOpenChest}
                  disabled={opening}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-zinc-900 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 disabled:from-amber-400/50 disabled:via-amber-500/50 disabled:to-amber-600/50 disabled:text-zinc-900/50 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  {opening ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                      {t("dailyChest.opening")}
                    </>
                  ) : (
                    t("dailyChest.open")
                  )}
                </button>
              ) : (
                <div className="inline-flex items-center gap-4 px-5 py-3 bg-zinc-800/80 border border-zinc-700/50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">{t("dailyChest.nextIn")}</span>
                    <span className="text-lg font-mono font-bold text-white tracking-wider">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{t("dailyChest.resetTime")}</span>
              </div>
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
