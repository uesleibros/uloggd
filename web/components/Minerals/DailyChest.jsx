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
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <div className="flex items-center gap-6 animate-pulse">
            <div className="w-28 h-28 bg-zinc-800 rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-1/3" />
              <div className="h-4 bg-zinc-800 rounded w-2/3" />
              <div className="h-10 bg-zinc-800 rounded w-28 mt-4" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative mb-10">
        <div className="relative rounded-xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative flex-shrink-0">
              <button
                onClick={handleOpenChest}
                disabled={!canOpen || opening}
                className={`relative group ${canOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <div className={`relative w-28 h-28 sm:w-32 sm:h-32 ${chestState === "shaking" ? "animate-clash-shake" : ""}`}>
                  {canOpen && chestState === "idle" && (
                    <div className="absolute -inset-2 bg-amber-500/10 rounded-full blur-lg" />
                  )}

                  {chestState === "burst" && (
                    <>
                      <div className="absolute -inset-4 bg-amber-400/20 rounded-full blur-xl" />
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full animate-particle"
                          style={{ "--angle": `${i * 45}deg`, animationDelay: `${i * 50}ms` }}
                        />
                      ))}
                    </>
                  )}

                  <img
                    src={isChestOpen ? "/chest/open.png" : "/chest/idle.png"}
                    alt="Daily Chest"
                    className={`
                      relative w-full h-full object-contain
                      transition-transform duration-200
                      ${canOpen && chestState === "idle" ? "group-hover:scale-105" : ""}
                      ${!canOpen ? "grayscale opacity-50" : ""}
                    `}
                    draggable={false}
                  />

                  {!canOpen && !opening && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-900/95 border border-zinc-700 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                  )}

                  {canOpen && chestState === "idle" && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                    </div>
                  )}
                </div>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
                <Gift className="w-4 h-4 text-amber-500" />
                <h3 className="text-lg font-semibold text-white">
                  {t("dailyChest.title")}
                </h3>
                {canOpen && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 rounded-full">
                    {t("dailyChest.available")}
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-500 mb-4 max-w-sm">
                {t("dailyChest.description")}
              </p>

              {canOpen ? (
                <button
                  onClick={handleOpenChest}
                  disabled={opening}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-900 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:text-zinc-900/60 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wide leading-none mb-0.5">
                      {t("dailyChest.nextIn")}
                    </span>
                    <span className="text-base font-mono font-semibold text-white tabular-nums">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-zinc-600 mt-3">
                {t("dailyChest.resetTime")}
              </p>
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
