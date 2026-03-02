import { useState, useEffect } from "react"
import { Lock, Sparkles, Clock, Gift } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { notify } from "@components/UI/Notification"
import ChestOpenModal from "./ChestOpenModal"

function Chest3DCanvas({ canOpen, chestState, onClick }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (chestState === "burst") {
      setParticles(
        Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2
          const dist = 45 + Math.random() * 35
          return {
            id: i,
            tx: Math.cos(angle) * dist,
            ty: Math.sin(angle) * dist,
            delay: i * 25,
            size: 3 + Math.random() * 5,
            color: ["#fbbf24", "#f59e0b", "#fef3c7", "#fde68a"][i % 4],
          }
        })
      )
    } else {
      setParticles([])
    }
  }, [chestState])

  const isOpen = chestState === "opening" || chestState === "burst"
  const isShaking = chestState === "shaking"

  return (
    <div className="relative w-32 h-32 sm:w-40 sm:h-40">
      <style>{`
        @keyframes chest-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-3px) rotate(-2deg); }
          20% { transform: translateX(3px) rotate(2deg); }
          30% { transform: translateX(-5px) rotate(-3deg); }
          40% { transform: translateX(5px) rotate(3deg); }
          50% { transform: translateX(-6px) rotate(-3.5deg); }
          60% { transform: translateX(6px) rotate(3.5deg); }
          70% { transform: translateX(-4px) rotate(-2deg); }
          80% { transform: translateX(4px) rotate(2deg); }
          90% { transform: translateX(-2px) rotate(-1deg); }
        }
        @keyframes chest-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes chest-glow-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.55; }
        }
        @keyframes light-beam {
          0% { transform: translateX(-50%) scaleY(0); opacity: 0; }
          60% { opacity: 1; }
          100% { transform: translateX(-50%) scaleY(1.2); opacity: 0.7; }
        }
        @keyframes particle-fly {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(-50% + var(--tx)),
              calc(-50% + var(--ty))
            ) scale(0);
            opacity: 0;
          }
        }
        @keyframes burst-flash {
          0% { opacity: 0; transform: scale(0.8); }
          40% { opacity: 0.9; }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes indicator-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          50% { transform: translateX(-50%) translateY(-5px) scale(1.15); }
        }
      `}</style>

      <div
        className={canOpen ? "cursor-pointer" : "cursor-not-allowed"}
        onClick={canOpen ? onClick : undefined}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          animation: isShaking
            ? "chest-shake 0.1s ease-in-out infinite"
            : canOpen && chestState === "idle"
              ? "chest-float 3s ease-in-out infinite"
              : "none",
        }}
      >
        {canOpen && chestState === "idle" && (
          <div
            className="absolute inset-[-15%] rounded-full bg-amber-500/30 pointer-events-none"
            style={{ animation: "chest-glow-pulse 2s ease-in-out infinite", filter: "blur(14px)" }}
          />
        )}

        {chestState === "burst" && (
          <div
            className="absolute inset-[-25%] rounded-full pointer-events-none"
            style={{
              animation: "burst-flash 0.6s ease-out forwards",
              background: "radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)",
            }}
          />
        )}

        <div className="relative w-full h-full" style={{ perspective: "600px" }}>

          <div
            className="absolute left-[10%] right-[10%] pointer-events-none transition-all"
            style={{
              top: "32%",
              height: "12%",
              opacity: isOpen ? 1 : 0,
              transitionDuration: "600ms",
              background: "radial-gradient(ellipse, rgba(251,191,36,0.9) 0%, rgba(251,191,36,0.2) 60%, transparent 85%)",
              filter: "blur(6px)",
            }}
          />

          {isOpen && (
            <>
              <div
                className="absolute left-1/2 pointer-events-none z-10"
                style={{
                  top: "5%",
                  width: "35%",
                  height: "30%",
                  animation: "light-beam 0.8s ease-out forwards",
                  transformOrigin: "bottom center",
                  background: "linear-gradient(to top, rgba(251,191,36,0.8), rgba(253,230,138,0.3), transparent)",
                  clipPath: "polygon(20% 100%, 80% 100%, 100% 0%, 0% 0%)",
                  filter: "blur(3px)",
                }}
              />
              <div
                className="absolute left-1/2 pointer-events-none z-10"
                style={{
                  top: "8%",
                  width: "20%",
                  height: "25%",
                  animation: "light-beam 0.6s 0.15s ease-out forwards",
                  transformOrigin: "bottom center",
                  background: "linear-gradient(to top, rgba(253,230,138,0.6), rgba(255,255,255,0.2), transparent)",
                  clipPath: "polygon(25% 100%, 75% 100%, 100% 0%, 0% 0%)",
                  filter: "blur(2px)",
                  opacity: 0,
                }}
              />
            </>
          )}

          <div
            className="absolute left-[7%] right-[7%] z-10"
            style={{
              top: "6%",
              height: "40%",
              transformOrigin: "top center",
              transform: isOpen ? "rotateX(-120deg)" : "rotateX(0deg)",
              transition: isShaking ? "none" : "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className={`
                w-full h-full rounded-t-[50%] relative overflow-hidden border-2
                ${canOpen
                  ? "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 border-amber-800"
                  : "bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-600 border-zinc-700"
                }
              `}
              style={{ backfaceVisibility: "hidden" }}
            >
              <div
                className={`
                  absolute inset-x-1 top-0.5 h-[45%] rounded-t-[45%]
                  ${canOpen ? "bg-gradient-to-b from-amber-300/40 to-transparent" : "bg-gradient-to-b from-zinc-300/25 to-transparent"}
                `}
              />
              <div className={`absolute bottom-0 left-0 right-0 h-[5px] ${canOpen ? "bg-amber-900/40" : "bg-zinc-700/40"}`} />
              <div className={`absolute top-0 bottom-0 left-0 w-[3px] ${canOpen ? "bg-amber-900/20" : "bg-zinc-700/20"}`} />
              <div className={`absolute top-0 bottom-0 right-0 w-[3px] ${canOpen ? "bg-amber-900/20" : "bg-zinc-700/20"}`} />
              <div className={`absolute bottom-[35%] left-[10%] right-[10%] h-[2px] rounded ${canOpen ? "bg-amber-900/15" : "bg-zinc-700/15"}`} />
              <div className={`absolute bottom-[60%] left-[15%] right-[15%] h-[2px] rounded ${canOpen ? "bg-amber-900/10" : "bg-zinc-700/10"}`} />
            </div>
          </div>

          <div
            className={`
              absolute left-[4%] right-[4%] bottom-[4%] h-[56%] rounded-b-xl relative overflow-hidden border-2
              ${canOpen
                ? "bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 border-amber-900"
                : "bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-800 border-zinc-800"
              }
            `}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                background: canOpen
                  ? "repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(120,53,15,0.4) 6px, rgba(120,53,15,0.4) 7px)"
                  : "repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(63,63,70,0.4) 6px, rgba(63,63,70,0.4) 7px)",
              }}
            />

            <div className={`absolute top-[18%] left-0 right-0 h-[3px] ${canOpen ? "bg-amber-500/30" : "bg-zinc-400/25"}`} />
            <div className={`absolute top-[50%] left-0 right-0 h-[3px] ${canOpen ? "bg-amber-500/30" : "bg-zinc-400/25"}`} />
            <div className={`absolute bottom-[15%] left-0 right-0 h-[3px] ${canOpen ? "bg-amber-500/30" : "bg-zinc-400/25"}`} />

            <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${canOpen ? "bg-amber-500/20" : "bg-zinc-400/15"}`} />
            <div className={`absolute top-0 bottom-0 right-0 w-[4px] ${canOpen ? "bg-amber-500/20" : "bg-zinc-400/15"}`} />

            {["top-0.5 left-0.5 rounded-tl", "top-0.5 right-0.5 rounded-tr", "bottom-0.5 left-0.5 rounded-bl", "bottom-0.5 right-0.5 rounded-br"].map((pos, i) => (
              <div
                key={i}
                className={`
                  absolute ${pos} w-2.5 h-2.5
                  ${canOpen
                    ? "bg-gradient-to-br from-yellow-400/50 to-yellow-600/30"
                    : "bg-gradient-to-br from-zinc-400/30 to-zinc-500/20"
                  }
                `}
              />
            ))}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: "38%" }}>
            <div
              className={`
                w-6 h-7 rounded-md relative flex items-center justify-center border
                ${canOpen
                  ? "bg-gradient-to-b from-yellow-300 to-yellow-500 border-yellow-600 shadow-md shadow-yellow-600/25"
                  : "bg-gradient-to-b from-zinc-400 to-zinc-500 border-zinc-600 shadow-md shadow-zinc-700/25"
                }
              `}
            >
              <div
                className={`
                  absolute inset-x-0.5 top-0.5 h-[35%] rounded-t-sm
                  ${canOpen ? "bg-yellow-200/40" : "bg-zinc-300/20"}
                `}
              />
              <div className="flex flex-col items-center">
                <div className={`w-1.5 h-1.5 rounded-full ${canOpen ? "bg-amber-800" : "bg-zinc-700"}`} />
                <div className={`w-1 h-1.5 -mt-0.5 rounded-b-sm ${canOpen ? "bg-amber-800" : "bg-zinc-700"}`} />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`
            absolute -bottom-1 left-1/2 -translate-x-1/2 w-[65%] h-2 rounded-full
            ${canOpen ? "bg-amber-900/20" : "bg-black/15"}
          `}
          style={{ filter: "blur(3px)" }}
        />

        {canOpen && chestState === "idle" && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/60 pointer-events-none"
                style={{
                  top: `${20 + i * 25}%`,
                  left: i % 2 === 0 ? "-2%" : "96%",
                  animation: `sparkle 2s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                  boxShadow: "0 0 4px rgba(251,191,36,0.5)",
                }}
              />
            ))}
          </>
        )}

        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              animation: `particle-fly 0.7s ease-out forwards`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}

        {canOpen && chestState === "idle" && (
          <div
            className="absolute -top-4 left-1/2 z-30 pointer-events-none"
            style={{ animation: "indicator-bounce 1.2s ease-in-out infinite" }}
          >
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 flex items-center justify-center">
                <span className="text-white font-black text-xs leading-none">!</span>
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
            </div>
          </div>
        )}

        {!canOpen && chestState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-zinc-800/85 border-2 border-zinc-600 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
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

