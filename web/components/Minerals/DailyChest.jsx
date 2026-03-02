import { useState, useEffect } from "react"
import { Lock } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { notify } from "@components/UI/Notification"
import ChestOpenModal from "./ChestOpenModal"

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/chest/@me/status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) throw new Error()

      const data = await res.json()
      setCanOpen(data.canOpen)
      if (!data.canOpen && data.secondsLeft) {
        setTimeLeft(data.secondsLeft)
      }
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

    await new Promise((r) => setTimeout(r, 800))
    setChestState("glowing")

    await new Promise((r) => setTimeout(r, 600))
    setChestState("burst")

    await new Promise((r) => setTimeout(r, 400))

    try {
      const { data: { session } } = await supabase.auth.getSession()
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
        notify(t(`dailyChest.errors.${data.error}`) || t("dailyChest.error"), "error")
        setChestState("idle")
        setOpening(false)
        return
      }

      setRewards(data.rewards)
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
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative">
              <button
                onClick={handleOpenChest}
                disabled={!canOpen || opening}
                className={`relative ${canOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <div className={`relative w-32 h-32 ${chestState === "shaking" ? "animate-clash-shake" : ""}`}>
                  {canOpen && chestState === "idle" && (
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-chest-ready-pulse" />
                  )}

                  {chestState === "glowing" && (
                    <>
                      <div className="absolute inset-0 rounded-2xl bg-amber-400/40 animate-chest-glow" />
                      <div className="absolute -inset-4 bg-amber-500/30 rounded-full blur-2xl animate-pulse" />
                    </>
                  )}

                  {chestState === "burst" && (
                    <>
                      <div className="absolute inset-0 bg-white/80 rounded-2xl animate-chest-burst" />
                      <div className="absolute -inset-8 bg-amber-400/50 rounded-full blur-3xl animate-ping" />
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-1/2 left-1/2 w-2 h-2 bg-amber-400 rounded-full animate-particle"
                          style={{ "--angle": `${i * 45}deg`, animationDelay: `${i * 50}ms` }}
                        />
                      ))}
                    </>
                  )}

                  <div
                    className={`
                      relative w-full h-full rounded-2xl flex items-center justify-center
                      transition-all duration-300 overflow-hidden
                      ${canOpen
                        ? "bg-gradient-to-b from-amber-600 to-amber-800 shadow-lg shadow-amber-900/50"
                        : "bg-gradient-to-b from-zinc-700 to-zinc-800 shadow-lg shadow-zinc-900/50"
                      }
                    `}
                  >
                    <div
                      className={`
                        absolute top-0 left-0 right-0 h-1/3 rounded-t-2xl
                        ${canOpen
                          ? "bg-gradient-to-b from-amber-500 to-amber-600"
                          : "bg-gradient-to-b from-zinc-600 to-zinc-700"
                        }
                      `}
                    />

                    <div
                      className={`
                        absolute top-[30%] left-1/2 -translate-x-1/2 w-8 h-6 rounded-sm
                        flex items-center justify-center
                        ${canOpen
                          ? "bg-yellow-400 shadow-md shadow-yellow-600/50"
                          : "bg-zinc-500"
                        }
                      `}
                    >
                      <div className={`w-2 h-3 rounded-sm ${canOpen ? "bg-yellow-600" : "bg-zinc-600"}`} />
                    </div>

                    <div
                      className={`
                        absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-2 rounded-full opacity-30
                        ${canOpen ? "bg-amber-950" : "bg-zinc-900"}
                      `}
                    />

                    {!canOpen && !opening && (
                      <div className="absolute inset-0 bg-zinc-900/40 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-zinc-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {canOpen && chestState === "idle" && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                      <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce shadow-lg shadow-amber-500/50" />
                    </div>
                  )}
                </div>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">
                  {t("dailyChest.title")}
                </h3>
                {canOpen && (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
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
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-amber-900 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:from-amber-400/50 disabled:to-amber-500/50 disabled:text-amber-900/50 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {opening ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin" />
                      {t("dailyChest.opening")}
                    </>
                  ) : (
                    t("dailyChest.open")
                  )}
                </button>
              ) : (
                <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500">{t("dailyChest.nextIn")}</span>
                    <span className="text-base font-mono font-bold text-white">
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