import { useState, useEffect } from "react"
import { Lock, Sparkles, Clock, Gift } from "lucide-react"
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
    await new Promise((r) => setTimeout(r, 1200))

    setChestState("opening")
    await new Promise((r) => setTimeout(r, 900))

    setChestState("burst")
    await new Promise((r) => setTimeout(r, 600))

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
      await new Promise((r) => setTimeout(r, 200))
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
      <style>{`
        @keyframes chest-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-3px) rotate(-1.5deg); }
          20% { transform: translateX(3px) rotate(1.5deg); }
          30% { transform: translateX(-5px) rotate(-2.5deg); }
          40% { transform: translateX(5px) rotate(2.5deg); }
          50% { transform: translateX(-7px) rotate(-3deg); }
          60% { transform: translateX(7px) rotate(3deg); }
          70% { transform: translateX(-5px) rotate(-2deg); }
          80% { transform: translateX(5px) rotate(2deg); }
          90% { transform: translateX(-2px) rotate(-1deg); }
        }
        @keyframes chest-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes chest-glow-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes chest-lid {
          0% { transform: perspective(300px) rotateX(0deg); }
          100% { transform: perspective(300px) rotateX(-120deg); }
        }
        @keyframes chest-light-ray {
          0% { opacity: 0; transform: translateX(-50%) scaleY(0); }
          100% { opacity: 1; transform: translateX(-50%) scaleY(1); }
        }
        @keyframes chest-flash {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(2); }
        }
        @keyframes exclamation-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          50% { transform: translateX(-50%) translateY(-4px) scale(1.15); }
        }
      `}</style>

      <div className="relative mb-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-8">

          {canOpen && chestState === "idle" && (
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          )}

          {chestState === "burst" && (
            <div
              className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
              style={{ animation: "chest-flash 0.6s ease-out forwards", background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)" }}
            />
          )}

          <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">

            <div className="relative flex-shrink-0">
              <button
                onClick={handleOpenChest}
                disabled={!canOpen || opening}
                className={`relative block ${canOpen ? "cursor-pointer" : "cursor-not-allowed"} group`}
              >
                <div
                  className="relative w-28 h-28 sm:w-32 sm:h-32"
                  style={{
                    animation: chestState === "shaking"
                      ? "chest-shake 0.12s ease-in-out infinite"
                      : canOpen && chestState === "idle"
                        ? "chest-float 3s ease-in-out infinite"
                        : "none",
                  }}
                >
                  <svg
                    viewBox="0 0 120 110"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full drop-shadow-lg"
                    style={{ filter: canOpen ? "drop-shadow(0 0 12px rgba(251,191,36,0.25))" : "none" }}
                  >
                    <defs>
                      <linearGradient id="bodyGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={canOpen ? "#b45309" : "#52525b"} />
                        <stop offset="50%" stopColor={canOpen ? "#92400e" : "#3f3f46"} />
                        <stop offset="100%" stopColor={canOpen ? "#78350f" : "#27272a"} />
                      </linearGradient>
                      <linearGradient id="lidGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={canOpen ? "#f59e0b" : "#71717a"} />
                        <stop offset="40%" stopColor={canOpen ? "#d97706" : "#52525b"} />
                        <stop offset="100%" stopColor={canOpen ? "#b45309" : "#3f3f46"} />
                      </linearGradient>
                      <linearGradient id="lockPlate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={canOpen ? "#fde68a" : "#a1a1aa"} />
                        <stop offset="100%" stopColor={canOpen ? "#f59e0b" : "#71717a"} />
                      </linearGradient>
                      <linearGradient id="metalBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={canOpen ? "#fbbf24" : "#a1a1aa"} />
                        <stop offset="100%" stopColor={canOpen ? "#d97706" : "#71717a"} />
                      </linearGradient>
                      <linearGradient id="cornerMetal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={canOpen ? "#fde68a" : "#a1a1aa"} />
                        <stop offset="100%" stopColor={canOpen ? "#b45309" : "#52525b"} />
                      </linearGradient>
                    </defs>

                    <g
                      style={{
                        transformOrigin: "60px 40px",
                        animation: chestState === "opening" || chestState === "burst"
                          ? "chest-lid 0.8s ease-out forwards"
                          : "none",
                      }}
                    >
                      <rect x="8" y="18" width="104" height="26" rx="4" fill="url(#lidGold)" />
                      <path d="M8 22 C8 18, 12 10, 60 8 C108 10, 112 18, 112 22 L112 22 L8 22 Z" fill="url(#lidGold)" opacity="0.7" />
                      <rect x="8" y="18" width="104" height="4" rx="2" fill={canOpen ? "#fbbf24" : "#a1a1aa"} opacity="0.3" />
                      <rect x="14" y="36" width="92" height="3" rx="1.5" fill={canOpen ? "#78350f" : "#27272a"} opacity="0.4" />
                      <rect x="8" y="40" width="104" height="4" rx="2" fill="url(#metalBand)" opacity="0.6" />
                    </g>

                    <rect x="6" y="44" width="108" height="52" rx="5" fill="url(#bodyGold)" />

                    <rect x="6" y="44" width="108" height="5" rx="2" fill="url(#metalBand)" opacity="0.5" />
                    <rect x="6" y="70" width="108" height="4" rx="2" fill="url(#metalBand)" opacity="0.3" />
                    <rect x="6" y="88" width="108" height="4" rx="2" fill="url(#metalBand)" opacity="0.4" />

                    <rect x="6" y="44" width="6" height="52" rx="2" fill="url(#metalBand)" opacity="0.35" />
                    <rect x="108" y="44" width="6" height="52" rx="2" fill="url(#metalBand)" opacity="0.35" />

                    <rect x="8" y="90" width="10" height="6" rx="2" fill="url(#cornerMetal)" />
                    <rect x="102" y="90" width="10" height="6" rx="2" fill="url(#cornerMetal)" />
                    <rect x="8" y="44" width="10" height="6" rx="2" fill="url(#cornerMetal)" opacity="0.6" />
                    <rect x="102" y="44" width="10" height="6" rx="2" fill="url(#cornerMetal)" opacity="0.6" />

                    <rect x="48" y="46" width="24" height="20" rx="4" fill="url(#lockPlate)" />
                    <rect x="50" y="48" width="20" height="16" rx="3" fill={canOpen ? "#f59e0b" : "#71717a"} opacity="0.5" />
                    <circle cx="60" cy="55" r="3.5" fill={canOpen ? "#78350f" : "#3f3f46"} />
                    <rect x="58.5" y="57" width="3" height="5" rx="1" fill={canOpen ? "#78350f" : "#3f3f46"} />

                    <rect x="12" y="50" width="30" height="40" rx="3" fill={canOpen ? "#92400e" : "#3f3f46"} opacity="0.15" />
                    <rect x="78" y="50" width="30" height="40" rx="3" fill={canOpen ? "#92400e" : "#3f3f46"} opacity="0.15" />

                    <ellipse cx="60" cy="100" rx="40" ry="4" fill="black" opacity="0.2" />
                  </svg>

                  {(chestState === "opening" || chestState === "burst") && (
                    <div
                      className="absolute left-1/2 pointer-events-none"
                      style={{
                        top: "15%",
                        width: "40px",
                        height: "60px",
                        transform: "translateX(-50%)",
                        animation: "chest-light-ray 0.7s ease-out forwards",
                        transformOrigin: "bottom center",
                        background: "linear-gradient(to top, rgba(251,191,36,0.8), rgba(253,230,138,0.4), transparent)",
                        clipPath: "polygon(30% 100%, 70% 100%, 90% 0%, 10% 0%)",
                        filter: "blur(3px)",
                      }}
                    />
                  )}

                  {canOpen && chestState === "idle" && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        animation: "chest-glow-pulse 2s ease-in-out infinite",
                        boxShadow: "0 0 25px rgba(251,191,36,0.3), 0 0 50px rgba(251,191,36,0.1)",
                      }}
                    />
                  )}

                  {!canOpen && !opening && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-9 h-9 rounded-full bg-zinc-800/90 border-2 border-zinc-600 flex items-center justify-center shadow-lg backdrop-blur-sm">
                        <Lock className="w-4 h-4 text-zinc-400" />
                      </div>
                    </div>
                  )}

                  {canOpen && chestState === "idle" && (
                    <div
                      className="absolute -top-4 left-1/2 z-20 pointer-events-none"
                      style={{ animation: "exclamation-bounce 1.2s ease-in-out infinite" }}
                    >
                      <div className="relative">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 flex items-center justify-center">
                          <span className="text-white font-black text-xs leading-none">!</span>
                        </div>
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <Gift className={`w-5 h-5 ${canOpen ? "text-amber-400" : "text-zinc-500"}`} />
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
                    ${opening
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
