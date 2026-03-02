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

    setChestState("lifting")
    await new Promise((r) => setTimeout(r, 800))

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
      setChestState("done")
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
            <div className="w-36 h-36 bg-zinc-800 rounded-2xl" />
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
        @keyframes cr-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-4px) rotate(-2deg); }
          20% { transform: translateX(4px) rotate(2deg); }
          30% { transform: translateX(-6px) rotate(-3deg); }
          40% { transform: translateX(6px) rotate(3deg); }
          50% { transform: translateX(-8px) rotate(-4deg); }
          60% { transform: translateX(8px) rotate(4deg); }
          70% { transform: translateX(-6px) rotate(-3deg); }
          80% { transform: translateX(6px) rotate(3deg); }
          90% { transform: translateX(-3px) rotate(-1deg); }
        }

        @keyframes cr-lid-open {
          0% { transform: rotateX(0deg) translateY(0); }
          40% { transform: rotateX(-20deg) translateY(-4px); }
          100% { transform: rotateX(-110deg) translateY(-16px); }
        }

        @keyframes cr-glow-beam {
          0% { opacity: 0; transform: scaleY(0) translateY(10px); }
          50% { opacity: 1; transform: scaleY(1) translateY(-20px); }
          100% { opacity: 0.8; transform: scaleY(1.2) translateY(-30px); }
        }

        @keyframes cr-burst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }

        @keyframes cr-particle {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% {
            transform: translate(
              calc(-50% + cos(var(--angle)) * 80px),
              calc(-50% + sin(var(--angle)) * 80px)
            ) scale(0);
            opacity: 0;
          }
        }

        @keyframes cr-sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }

        @keyframes cr-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        @keyframes cr-ready-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.1); }
          50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.2), 0 0 80px rgba(251, 191, 36, 0.1); }
        }

        @keyframes cr-exclamation {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.1); }
        }

        .chest-shaking {
          animation: cr-shake 0.15s ease-in-out infinite;
        }

        .chest-lid-opening {
          animation: cr-lid-open 0.8s ease-out forwards;
          transform-origin: top center;
        }

        .chest-glow-beam {
          animation: cr-glow-beam 0.8s ease-out forwards;
        }

        .chest-burst {
          animation: cr-burst 0.6s ease-out forwards;
        }

        .chest-ready {
          animation: cr-ready-glow 2s ease-in-out infinite, cr-float 3s ease-in-out infinite;
        }

        .chest-sparkle {
          animation: cr-sparkle 1.5s ease-in-out infinite;
        }

        .chest-exclamation {
          animation: cr-exclamation 1s ease-in-out infinite;
        }
      `}</style>

      <div className="relative mb-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-8">

          {canOpen && chestState === "idle" && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />
            </>
          )}

          {chestState === "burst" && (
            <div className="absolute inset-0 bg-amber-400/20 backdrop-blur-sm z-10 pointer-events-none chest-burst rounded-2xl" />
          )}

          <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8">

            <div className="relative">
              <button
                onClick={handleOpenChest}
                disabled={!canOpen || opening}
                className={`relative group ${canOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
                aria-label={canOpen ? t("dailyChest.open") : t("dailyChest.locked")}
              >
                <div
                  className={`
                    relative w-36 h-36 sm:w-40 sm:h-40
                    ${chestState === "shaking" ? "chest-shaking" : ""}
                    ${canOpen && chestState === "idle" ? "chest-ready" : ""}
                    transition-transform duration-300
                    ${canOpen && chestState === "idle" ? "group-hover:scale-105" : ""}
                  `}
                >

                  {canOpen && chestState === "idle" && (
                    <>
                      {[...Array(4)].map((_, i) => (
                        <Sparkles
                          key={i}
                          className="absolute text-amber-400/60 w-3 h-3 chest-sparkle pointer-events-none"
                          style={{
                            top: `${10 + i * 20}%`,
                            left: `${i % 2 === 0 ? -10 : 100}%`,
                            animationDelay: `${i * 0.4}s`,
                          }}
                        />
                      ))}
                    </>
                  )}

                  <div className="relative w-full h-full" style={{ perspective: "400px" }}>

                    <div
                      className={`
                        absolute top-0 left-1 right-1 h-[38%] z-10
                        ${chestState === "lifting" || chestState === "burst" || chestState === "done"
                          ? "chest-lid-opening" : ""
                        }
                      `}
                      style={{ transformOrigin: "top center" }}
                    >
                      <div
                        className={`
                          w-full h-full rounded-t-2xl relative overflow-hidden
                          ${canOpen
                            ? "bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700"
                            : "bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-700"
                          }
                        `}
                      >
                        <div
                          className={`
                            absolute inset-x-0 top-0 h-1/2
                            ${canOpen
                              ? "bg-gradient-to-b from-amber-400/40 to-transparent"
                              : "bg-gradient-to-b from-zinc-400/30 to-transparent"
                            }
                          `}
                        />

                        <div
                          className={`
                            absolute bottom-1 left-2 right-2 h-[2px] rounded-full
                            ${canOpen ? "bg-amber-800/40" : "bg-zinc-800/40"}
                          `}
                        />
                        <div
                          className={`
                            absolute bottom-3 left-3 right-3 h-[2px] rounded-full
                            ${canOpen ? "bg-amber-800/20" : "bg-zinc-800/20"}
                          `}
                        />

                        <div
                          className={`
                            absolute top-0 bottom-0 left-0 w-[3px]
                            ${canOpen ? "bg-amber-800/30" : "bg-zinc-800/30"}
                          `}
                        />
                        <div
                          className={`
                            absolute top-0 bottom-0 right-0 w-[3px]
                            ${canOpen ? "bg-amber-800/30" : "bg-zinc-800/30"}
                          `}
                        />
                      </div>
                    </div>

                    <div
                      className={`
                        absolute bottom-0 left-0 right-0 h-[68%] rounded-b-xl overflow-hidden
                        ${canOpen
                          ? "bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900"
                          : "bg-gradient-to-b from-zinc-600 via-zinc-700 to-zinc-800"
                        }
                      `}
                    >
                      <div
                        className={`
                          absolute inset-0 opacity-20
                          ${canOpen
                            ? "bg-[repeating-linear-gradient(0deg,transparent,transparent_8px,rgba(120,53,15,0.3)_8px,rgba(120,53,15,0.3)_9px)]"
                            : "bg-[repeating-linear-gradient(0deg,transparent,transparent_8px,rgba(63,63,70,0.3)_8px,rgba(63,63,70,0.3)_9px)]"
                          }
                        `}
                      />

                      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10">
                        <div
                          className={`
                            w-10 h-10 rounded-lg relative flex items-center justify-center
                            ${canOpen
                              ? "bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-lg shadow-yellow-500/40"
                              : "bg-gradient-to-b from-zinc-400 to-zinc-500 shadow-lg shadow-zinc-700/40"
                            }
                          `}
                        >
                          <div
                            className={`
                              absolute inset-0.5 rounded-md
                              ${canOpen
                                ? "bg-gradient-to-b from-yellow-200/50 to-transparent"
                                : "bg-gradient-to-b from-zinc-300/30 to-transparent"
                              }
                            `}
                          />
                          <div className="relative flex flex-col items-center gap-0.5">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${canOpen ? "bg-amber-800" : "bg-zinc-700"}`}
                            />
                            <div
                              className={`w-1.5 h-2 rounded-b-sm ${canOpen ? "bg-amber-800" : "bg-zinc-700"}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        className={`
                          absolute top-[45%] left-0 right-0 h-[3px]
                          ${canOpen ? "bg-amber-600/40" : "bg-zinc-500/40"}
                        `}
                      />
                      <div
                        className={`
                          absolute top-[70%] left-0 right-0 h-[3px]
                          ${canOpen ? "bg-amber-600/40" : "bg-zinc-500/40"}
                        `}
                      />

                      {[
                        "bottom-1 left-1",
                        "bottom-1 right-1",
                      ].map((pos, i) => (
                        <div
                          key={i}
                          className={`
                            absolute ${pos} w-4 h-4 rounded-sm
                            ${canOpen
                              ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                              : "bg-gradient-to-br from-zinc-400 to-zinc-500"
                            }
                          `}
                        />
                      ))}

                      <div
                        className={`
                          absolute top-0 bottom-0 left-0 w-[3px]
                          ${canOpen ? "bg-amber-900/40" : "bg-zinc-800/40"}
                        `}
                      />
                      <div
                        className={`
                          absolute top-0 bottom-0 right-0 w-[3px]
                          ${canOpen ? "bg-amber-900/40" : "bg-zinc-800/40"}
                        `}
                      />
                    </div>

                    {(chestState === "lifting" || chestState === "burst") && (
                      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 z-5 chest-glow-beam">
                        <div className="w-20 h-28 bg-gradient-to-t from-amber-400/80 via-amber-300/40 to-transparent blur-md" style={{ clipPath: "polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)" }} />
                      </div>
                    )}

                    {chestState === "burst" && (
                      <>
                        {[...Array(12)].map((_, i) => {
                          const angle = (i * 30) * (Math.PI / 180)
                          return (
                            <div
                              key={i}
                              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full z-20"
                              style={{
                                background: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f59e0b" : "#fef3c7",
                                animation: `cr-particle 0.6s ease-out forwards`,
                                animationDelay: `${i * 30}ms`,
                                "--angle": `${angle}rad`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          )
                        })}
                      </>
                    )}

                    {!canOpen && !opening && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-zinc-900/30 rounded-xl backdrop-blur-[1px]" />
                        <div className="relative w-10 h-10 rounded-full bg-zinc-800/90 border-2 border-zinc-600 flex items-center justify-center shadow-lg">
                          <Lock className="w-4 h-4 text-zinc-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  {canOpen && chestState === "idle" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 chest-exclamation">
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full bg-green-500 shadow-lg shadow-green-500/50 flex items-center justify-center">
                          <span className="text-white font-black text-sm leading-none">!</span>
                        </div>
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`
                      absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-3 rounded-full blur-md
                      ${canOpen ? "bg-amber-900/30" : "bg-black/30"}
                    `}
                  />
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
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
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
                      : "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-amber-950 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-95"
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
