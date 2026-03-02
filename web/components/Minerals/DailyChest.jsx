import { useState, useEffect, useCallback } from "react"
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
  const [hovered, setHovered] = useState(false)

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

  const fetchStatus = useCallback(async () => {
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
  }, [])

  async function handleOpenChest() {
    if (!canOpen || opening) return
    setOpening(true)

    setChestState("shaking")
    await new Promise((r) => setTimeout(r, 1500))

    setChestState("lifting")
    await new Promise((r) => setTimeout(r, 1000))

    setChestState("burst")
    await new Promise((r) => setTimeout(r, 800))

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
      await new Promise((r) => setTimeout(r, 400))
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
            <div className="w-44 h-44 bg-zinc-800 rounded-2xl" />
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

  const isReady = canOpen && chestState === "idle"

  return (
    <>
      <style>{`
        @keyframes chest-shake {
          0%, 100% { transform: translateX(0) rotate(0deg) scale(1); }
          5% { transform: translateX(-3px) rotate(-1.5deg) scale(1.01); }
          10% { transform: translateX(3px) rotate(1.5deg) scale(1.01); }
          15% { transform: translateX(-4px) rotate(-2deg) scale(1.02); }
          20% { transform: translateX(4px) rotate(2deg) scale(1.02); }
          25% { transform: translateX(-5px) rotate(-2.5deg) scale(1.03); }
          30% { transform: translateX(5px) rotate(2.5deg) scale(1.03); }
          35% { transform: translateX(-6px) rotate(-3deg) scale(1.04); }
          40% { transform: translateX(6px) rotate(3deg) scale(1.04); }
          45% { transform: translateX(-7px) rotate(-3.5deg) scale(1.05); }
          50% { transform: translateX(7px) rotate(3.5deg) scale(1.05); }
          55% { transform: translateX(-8px) rotate(-4deg) scale(1.05); }
          60% { transform: translateX(8px) rotate(4deg) scale(1.05); }
          65% { transform: translateX(-7px) rotate(-3.5deg) scale(1.04); }
          70% { transform: translateX(7px) rotate(3.5deg) scale(1.04); }
          75% { transform: translateX(-6px) rotate(-3deg) scale(1.03); }
          80% { transform: translateX(5px) rotate(2.5deg) scale(1.02); }
          85% { transform: translateX(-4px) rotate(-2deg) scale(1.01); }
          90% { transform: translateX(3px) rotate(1.5deg) scale(1); }
          95% { transform: translateX(-2px) rotate(-1deg) scale(1); }
        }

        @keyframes chest-lid-open {
          0% { transform: rotateX(0deg) translateY(0); }
          20% { transform: rotateX(-15deg) translateY(-2px); }
          40% { transform: rotateX(-5deg) translateY(-1px); }
          60% { transform: rotateX(-80deg) translateY(-10px); }
          80% { transform: rotateX(-100deg) translateY(-14px); }
          100% { transform: rotateX(-115deg) translateY(-18px); }
        }

        @keyframes chest-glow-beam {
          0% { opacity: 0; transform: scaleY(0) scaleX(0.5); }
          30% { opacity: 0.6; transform: scaleY(0.5) scaleX(0.8); }
          60% { opacity: 1; transform: scaleY(1) scaleX(1); }
          100% { opacity: 0.9; transform: scaleY(1.3) scaleX(1.2); }
        }

        @keyframes chest-burst-flash {
          0% { opacity: 0; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(2.5); }
        }

        @keyframes chest-particle-fly {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          60% {
            opacity: 0.8;
          }
          100% {
            transform: translate(
              calc(-50% + var(--dx)),
              calc(-50% + var(--dy))
            ) scale(0);
            opacity: 0;
          }
        }

        @keyframes chest-star-fly {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scale(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(72deg) scale(1);
          }
          100% {
            transform: translate(
              calc(-50% + var(--dx)),
              calc(-50% + var(--dy))
            ) rotate(360deg) scale(0);
            opacity: 0;
          }
        }

        @keyframes chest-sparkle-idle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          25% { opacity: 0.4; transform: scale(0.6) rotate(90deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
          75% { opacity: 0.4; transform: scale(0.6) rotate(270deg); }
        }

        @keyframes chest-breathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }

        @keyframes chest-ready-glow {
          0%, 100% {
            box-shadow:
              0 0 15px rgba(251, 191, 36, 0.2),
              0 0 30px rgba(251, 191, 36, 0.1),
              inset 0 0 15px rgba(251, 191, 36, 0.05);
          }
          50% {
            box-shadow:
              0 0 25px rgba(251, 191, 36, 0.4),
              0 0 50px rgba(251, 191, 36, 0.2),
              0 0 80px rgba(251, 191, 36, 0.1),
              inset 0 0 20px rgba(251, 191, 36, 0.1);
          }
        }

        @keyframes chest-badge-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-4px) scale(1.15); }
          60% { transform: translateY(-2px) scale(1.05); }
        }

        @keyframes chest-ring-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }

        @keyframes chest-inner-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }

        @keyframes chest-lid-crack {
          0%, 30% { transform: rotateX(0deg); }
          40% { transform: rotateX(-8deg); }
          50% { transform: rotateX(-3deg); }
          60% { transform: rotateX(-12deg); }
          70% { transform: rotateX(-5deg); }
          80% { transform: rotateX(-15deg); }
          90% { transform: rotateX(-8deg); }
          100% { transform: rotateX(-10deg); }
        }

        @keyframes chest-lock-wiggle {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          20% { transform: translateX(-50%) rotate(-8deg); }
          40% { transform: translateX(-50%) rotate(8deg); }
          60% { transform: translateX(-50%) rotate(-5deg); }
          80% { transform: translateX(-50%) rotate(5deg); }
        }

        .chest-is-shaking {
          animation: chest-shake 0.2s ease-in-out infinite;
        }

        .chest-is-shaking .chest-lid-piece {
          animation: chest-lid-crack 0.4s ease-in-out infinite;
          transform-origin: top center;
        }

        .chest-is-shaking .chest-lock-piece {
          animation: chest-lock-wiggle 0.3s ease-in-out infinite;
        }

        .chest-lid-is-opening {
          animation: chest-lid-open 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: top center;
        }

        .chest-glow-is-active {
          animation: chest-glow-beam 1s ease-out forwards;
        }

        .chest-burst-is-active {
          animation: chest-burst-flash 0.8s ease-out forwards;
        }

        .chest-is-ready {
          animation: chest-ready-glow 2.5s ease-in-out infinite, chest-breathe 3.5s ease-in-out infinite;
          border-radius: 1rem;
        }

        .chest-sparkle-anim {
          animation: chest-sparkle-idle 2s ease-in-out infinite;
        }

        .chest-badge-anim {
          animation: chest-badge-bounce 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative mb-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/95 to-zinc-950 border border-zinc-800/80 p-6 sm:p-8">

          {isReady && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/15 via-amber-900/5 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-500/8 blur-[60px] pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-400/5 blur-[40px] pointer-events-none" />
            </>
          )}

          {chestState === "burst" && (
            <div className="absolute inset-0 bg-amber-400/25 backdrop-blur-sm z-10 pointer-events-none chest-burst-is-active rounded-2xl" />
          )}

          <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">

            <div className="relative">
              <button
                onClick={handleOpenChest}
                disabled={!canOpen || opening}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`relative group outline-none ${canOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
                aria-label={canOpen ? t("dailyChest.open") : t("dailyChest.locked")}
              >
                <div
                  className={`
                    relative w-40 h-40 sm:w-44 sm:h-44
                    ${chestState === "shaking" ? "chest-is-shaking" : ""}
                    ${isReady ? "chest-is-ready" : ""}
                    transition-transform duration-500 ease-out
                    ${isReady && hovered ? "scale-110" : ""}
                  `}
                >
                  {isReady && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <Sparkles
                          key={i}
                          className="absolute text-amber-400/50 chest-sparkle-anim pointer-events-none"
                          style={{
                            width: `${10 + (i % 3) * 4}px`,
                            height: `${10 + (i % 3) * 4}px`,
                            top: `${5 + Math.sin(i * 1.2) * 40 + 40}%`,
                            left: `${5 + Math.cos(i * 1.5) * 40 + 40}%`,
                            animationDelay: `${i * 0.35}s`,
                            animationDuration: `${1.8 + i * 0.2}s`,
                          }}
                        />
                      ))}

                      {[...Array(3)].map((_, i) => (
                        <div
                          key={`ring-${i}`}
                          className="absolute inset-0 rounded-2xl border border-amber-400/20 pointer-events-none"
                          style={{
                            animation: `chest-ring-pulse 2.5s ease-out infinite`,
                            animationDelay: `${i * 0.8}s`,
                          }}
                        />
                      ))}
                    </>
                  )}

                  <div className="relative w-full h-full" style={{ perspective: "500px" }}>

                    <div
                      className={`
                        absolute top-0 left-0.5 right-0.5 h-[36%] z-10
                        ${chestState === "lifting" || chestState === "burst" || chestState === "done"
                          ? "chest-lid-is-opening" : ""
                        }
                        ${chestState === "shaking" ? "chest-lid-piece" : ""}
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
                            absolute inset-x-0 top-0 h-2/3
                            ${canOpen
                              ? "bg-gradient-to-b from-amber-400/50 to-transparent"
                              : "bg-gradient-to-b from-zinc-400/30 to-transparent"
                            }
                          `}
                        />

                        <div
                          className={`
                            absolute inset-x-2 top-[40%] h-[2px] rounded-full
                            ${canOpen ? "bg-amber-800/30" : "bg-zinc-800/30"}
                          `}
                        />

                        <div
                          className={`
                            absolute bottom-0 left-2 right-2 h-[3px] rounded-full
                            ${canOpen ? "bg-amber-800/50" : "bg-zinc-800/40"}
                          `}
                        />
                        <div
                          className={`
                            absolute bottom-[5px] left-3 right-3 h-[2px] rounded-full
                            ${canOpen ? "bg-amber-800/25" : "bg-zinc-800/20"}
                          `}
                        />

                        <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${canOpen ? "bg-amber-800/35" : "bg-zinc-800/30"}`} />
                        <div className={`absolute top-0 bottom-0 right-0 w-[4px] ${canOpen ? "bg-amber-800/35" : "bg-zinc-800/30"}`} />

                        <div className={`absolute top-0 left-[15%] w-[3px] h-full ${canOpen ? "bg-amber-400/10" : "bg-zinc-400/10"}`} />
                        <div className={`absolute top-0 right-[15%] w-[3px] h-full ${canOpen ? "bg-amber-400/10" : "bg-zinc-400/10"}`} />
                      </div>
                    </div>

                    <div
                      className={`
                        absolute bottom-0 left-0 right-0 h-[70%] rounded-b-2xl overflow-hidden
                        ${canOpen
                          ? "bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900"
                          : "bg-gradient-to-b from-zinc-600 via-zinc-700 to-zinc-800"
                        }
                      `}
                    >
                      <div
                        className={`
                          absolute inset-0 opacity-15
                          ${canOpen
                            ? "bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,rgba(120,53,15,0.25)_10px,rgba(120,53,15,0.25)_11px)]"
                            : "bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,rgba(63,63,70,0.25)_10px,rgba(63,63,70,0.25)_11px)]"
                          }
                        `}
                      />

                      <div className={`absolute top-0 left-[20%] w-[3px] h-full ${canOpen ? "bg-amber-500/8" : "bg-zinc-500/8"}`} />
                      <div className={`absolute top-0 right-[20%] w-[3px] h-full ${canOpen ? "bg-amber-500/8" : "bg-zinc-500/8"}`} />
                      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full ${canOpen ? "bg-amber-500/5" : "bg-zinc-500/5"}`} />

                      <div className={`chest-lock-piece absolute -top-1 left-1/2 -translate-x-1/2 z-10`}>
                        <div
                          className={`
                            w-12 h-12 rounded-xl relative flex items-center justify-center
                            ${canOpen
                              ? "bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/50"
                              : "bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-600 shadow-lg shadow-zinc-700/40"
                            }
                          `}
                        >
                          <div
                            className={`
                              absolute inset-0.5 rounded-lg
                              ${canOpen
                                ? "bg-gradient-to-b from-yellow-200/60 to-transparent"
                                : "bg-gradient-to-b from-zinc-300/30 to-transparent"
                              }
                            `}
                          />

                          <div className={`absolute inset-[3px] rounded-lg border ${canOpen ? "border-yellow-600/30" : "border-zinc-600/30"}`} />

                          <div className="relative flex flex-col items-center gap-0.5">
                            <div className={`w-3 h-3 rounded-full border-2 ${canOpen ? "border-amber-800 bg-amber-700/30" : "border-zinc-700 bg-zinc-600/30"}`} />
                            <div className={`w-1.5 h-2.5 rounded-b-sm ${canOpen ? "bg-amber-800" : "bg-zinc-700"}`} />
                          </div>

                          {isReady && (
                            <div
                              className="absolute inset-0 rounded-xl"
                              style={{ animation: "chest-inner-glow 2s ease-in-out infinite", background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)" }}
                            />
                          )}
                        </div>
                      </div>

                      <div className={`absolute top-[40%] left-0 right-0 h-[4px] ${canOpen ? "bg-amber-500/25" : "bg-zinc-500/25"}`}>
                        <div className={`absolute inset-x-0 top-0 h-[1px] ${canOpen ? "bg-amber-400/20" : "bg-zinc-400/15"}`} />
                      </div>
                      <div className={`absolute top-[65%] left-0 right-0 h-[4px] ${canOpen ? "bg-amber-500/25" : "bg-zinc-500/25"}`}>
                        <div className={`absolute inset-x-0 top-0 h-[1px] ${canOpen ? "bg-amber-400/20" : "bg-zinc-400/15"}`} />
                      </div>

                      {["bottom-1 left-1", "bottom-1 right-1", "top-[38%] left-1", "top-[38%] right-1"].map((pos, i) => (
                        <div
                          key={i}
                          className={`
                            absolute ${pos} w-4 h-4 rounded-full
                            ${canOpen
                              ? "bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm shadow-yellow-600/30"
                              : "bg-gradient-to-br from-zinc-400 to-zinc-500"
                            }
                          `}
                        >
                          <div className={`absolute inset-[2px] rounded-full ${canOpen ? "bg-yellow-500/40" : "bg-zinc-400/20"}`} />
                        </div>
                      ))}

                      <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${canOpen ? "bg-amber-900/45" : "bg-zinc-800/40"}`} />
                      <div className={`absolute top-0 bottom-0 right-0 w-[4px] ${canOpen ? "bg-amber-900/45" : "bg-zinc-800/40"}`} />
                      <div className={`absolute bottom-0 left-0 right-0 h-[4px] ${canOpen ? "bg-amber-950/50" : "bg-zinc-900/40"}`} />

                      {isReady && (
                        <div className="absolute inset-0 pointer-events-none" style={{ animation: "chest-inner-glow 3s ease-in-out infinite", background: "radial-gradient(ellipse at center top, rgba(251,191,36,0.08) 0%, transparent 60%)" }} />
                      )}
                    </div>

                    {(chestState === "lifting" || chestState === "burst") && (
                      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 z-5 chest-glow-is-active">
                        <div className="relative">
                          <div
                            className="w-24 h-32 bg-gradient-to-t from-amber-400/90 via-amber-300/50 to-amber-100/20 blur-sm"
                            style={{ clipPath: "polygon(25% 100%, 75% 100%, 100% 0%, 0% 0%)" }}
                          />
                          <div
                            className="absolute inset-0 w-24 h-32 bg-gradient-to-t from-yellow-300/60 via-yellow-200/30 to-transparent blur-lg"
                            style={{ clipPath: "polygon(30% 100%, 70% 100%, 95% 0%, 5% 0%)" }}
                          />
                        </div>
                      </div>
                    )}

                    {chestState === "burst" && (
                      <>
                        {[...Array(16)].map((_, i) => {
                          const angle = (i * 22.5) * (Math.PI / 180)
                          const dist = 60 + Math.random() * 50
                          const dx = Math.cos(angle) * dist
                          const dy = Math.sin(angle) * dist
                          const size = 3 + Math.random() * 4
                          const colors = ["#fbbf24", "#f59e0b", "#fef3c7", "#fde68a", "#d97706"]
                          return (
                            <div
                              key={`p-${i}`}
                              className="absolute top-1/2 left-1/2 rounded-full z-20"
                              style={{
                                width: `${size}px`,
                                height: `${size}px`,
                                background: colors[i % colors.length],
                                animation: `chest-particle-fly 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                                animationDelay: `${i * 25}ms`,
                                "--dx": `${dx}px`,
                                "--dy": `${dy}px`,
                                transform: "translate(-50%, -50%)",
                                boxShadow: `0 0 ${size}px ${colors[i % colors.length]}80`,
                              }}
                            />
                          )
                        })}
                        {[...Array(8)].map((_, i) => {
                          const angle = (i * 45 + 20) * (Math.PI / 180)
                          const dist = 40 + Math.random() * 30
                          return (
                            <div
                              key={`s-${i}`}
                              className="absolute top-1/2 left-1/2 z-20 pointer-events-none"
                              style={{
                                animation: `chest-star-fly 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                                animationDelay: `${100 + i * 40}ms`,
                                "--dx": `${Math.cos(angle) * dist}px`,
                                "--dy": `${Math.sin(angle) * dist}px`,
                                transform: "translate(-50%, -50%)",
                              }}
                            >
                              <Sparkles className="w-3 h-3 text-yellow-300" style={{ filter: "drop-shadow(0 0 4px rgba(253, 224, 71, 0.8))" }} />
                            </div>
                          )
                        })}
                      </>
                    )}

                    {!canOpen && !opening && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-zinc-900/40 rounded-2xl backdrop-blur-[2px]" />
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-zinc-800/95 border-2 border-zinc-600/80 flex items-center justify-center shadow-xl shadow-black/30">
                            <Lock className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div className="absolute -inset-1 rounded-full border border-zinc-600/30" />
                        </div>
                      </div>
                    )}
                  </div>

                  {isReady && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 chest-badge-anim">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-green-400 to-green-600 shadow-lg shadow-green-500/60 flex items-center justify-center border border-green-300/30">
                          <span className="text-white font-black text-sm leading-none drop-shadow-sm">!</span>
                        </div>
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
                        <div className="absolute -inset-1.5 rounded-full border border-green-400/20 animate-pulse" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`
                      absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%] h-4 rounded-[50%] blur-lg
                      ${canOpen ? "bg-amber-900/25" : "bg-black/25"}
                    `}
                  />
                </div>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
                <div className={`p-1.5 rounded-lg ${canOpen ? "bg-amber-500/15" : "bg-zinc-800/50"}`}>
                  <Gift className={`w-5 h-5 ${canOpen ? "text-amber-400" : "text-zinc-500"}`} />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {t("dailyChest.title")}
                </h3>
                {canOpen && (
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/25 rounded-full animate-pulse">
                    {t("dailyChest.available")}
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-400 mb-6 max-w-md leading-relaxed">
                {t("dailyChest.description")}
              </p>

              {canOpen ? (
                <button
                  onClick={handleOpenChest}
                  disabled={opening}
                  className={`
                    relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-bold uppercase tracking-wide
                    rounded-xl transition-all duration-300 overflow-hidden cursor-pointer
                    ${opening
                      ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                      : "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-amber-950 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-400/50 hover:shadow-xl hover:scale-[1.03] active:scale-[0.97]"
                    }
                  `}
                >
                  {!opening && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  )}
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
                <div className="inline-flex items-center gap-4 px-6 py-3.5 bg-zinc-800/50 border border-zinc-700/40 rounded-xl backdrop-blur-sm">
                  <div className="p-1.5 rounded-lg bg-zinc-700/50">
                    <Clock className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      {t("dailyChest.nextIn")}
                    </span>
                    <span className="text-lg font-mono font-bold text-white tabular-nums tracking-wider">
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
