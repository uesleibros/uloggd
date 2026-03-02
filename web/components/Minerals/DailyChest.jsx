import { useState, useEffect, useCallback } from "react"
import { Lock, Sparkles, Clock, Gift } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import { notify } from "@components/UI/Notification"
import ChestOpenModal from "./ChestOpenModal"

function ChestSVG({ canOpen, chestState }) {
  const isReady = canOpen && chestState === "idle"
  const isShaking = chestState === "shaking"
  const isOpen = chestState === "lifting" || chestState === "burst" || chestState === "done"

  const primary = canOpen ? "#d97706" : "#52525b"
  const primaryLight = canOpen ? "#f59e0b" : "#71717a"
  const primaryDark = canOpen ? "#92400e" : "#3f3f46"
  const primaryDarker = canOpen ? "#78350f" : "#27272a"
  const accent = canOpen ? "#fbbf24" : "#a1a1aa"
  const accentLight = canOpen ? "#fde68a" : "#d4d4d8"
  const metalLight = canOpen ? "#fef3c7" : "#e4e4e7"
  const metalDark = canOpen ? "#b45309" : "#52525b"
  const shadow = canOpen ? "#451a03" : "#18181b"
  const sparkleColor = canOpen ? "#fbbf24" : "transparent"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -50 500 400"
      className={`w-full h-full ${isShaking ? "chest-svg-shake" : ""} ${isReady ? "chest-svg-breathe" : ""}`}
      style={{ filter: canOpen ? "drop-shadow(0 0 20px rgba(251, 191, 36, 0.15))" : "none" }}
    >
      <defs>
        <linearGradient id="chest-body-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryLight} />
          <stop offset="100%" stopColor={primaryDark} />
        </linearGradient>
        <linearGradient id="chest-lid-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryLight} />
          <stop offset="50%" stopColor={primary} />
          <stop offset="100%" stopColor={primaryDark} />
        </linearGradient>
        <linearGradient id="chest-band-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentLight} />
          <stop offset="50%" stopColor={accent} />
          <stop offset="100%" stopColor={metalDark} />
        </linearGradient>
        <linearGradient id="chest-lock-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentLight} />
          <stop offset="100%" stopColor={metalDark} />
        </linearGradient>
        <filter id="chest-glow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="chest-inner-shadow">
          <feOffset dx="0" dy="3" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feFlood floodColor={shadow} floodOpacity="0.4" />
          <feComposite in2="SourceAlpha" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g id="chest-bottom">
        <ellipse cx="248" cy="305" rx="140" ry="12" fill={shadow} opacity="0.3" />

        <rect x="115" y="168" width="270" height="135" rx="4" fill={primaryDark} />
        <rect x="117" y="170" width="266" height="131" rx="3" fill="url(#chest-body-grad)" />

        <rect x="117" y="240" width="266" height="4" fill={primaryDarker} opacity="0.4" />

        <rect x="45" y="167" width="410" height="42" rx="20" fill={metalDark} />
        <rect x="47" y="167" width="406" height="38" rx="18" fill="url(#chest-band-grad)" />
        <rect x="47" y="167" width="406" height="12" rx="6" fill={metalLight} opacity="0.3" />

        <rect x="62" y="184" width="14" height="74" rx="7" fill="url(#chest-band-grad)" />
        <rect x="64" y="186" width="10" height="70" rx="5" fill={accent} opacity="0.3" />

        <rect x="425" y="184" width="14" height="74" rx="7" fill="url(#chest-band-grad)" />
        <rect x="427" y="186" width="10" height="70" rx="5" fill={accent} opacity="0.3" />

        <rect x="100" y="167" width="22" height="137" rx="2" fill={metalDark} />
        <rect x="102" y="167" width="18" height="137" rx="2" fill="url(#chest-band-grad)" />
        <rect x="102" y="167" width="18" height="8" rx="2" fill={metalLight} opacity="0.3" />

        <rect x="376" y="167" width="22" height="137" rx="2" fill={metalDark} />
        <rect x="378" y="167" width="18" height="137" rx="2" fill="url(#chest-band-grad)" />
        <rect x="378" y="167" width="18" height="8" rx="2" fill={metalLight} opacity="0.3" />

        <polygon points="117,168 133,126 363,126 383,168" fill={primaryDarker} opacity="0.3" />

        <circle cx="153" cy="249" r="12" fill={metalDark} />
        <circle cx="153" cy="247" r="12" fill="url(#chest-band-grad)" />
        <circle cx="153" cy="245" r="5" fill={metalLight} opacity="0.4" />

        <circle cx="347" cy="249" r="12" fill={metalDark} />
        <circle cx="347" cy="247" r="12" fill="url(#chest-band-grad)" />
        <circle cx="347" cy="245" r="5" fill={metalLight} opacity="0.4" />
      </g>

      {isOpen && canOpen && (
        <g className="chest-glow-beam-anim">
          <rect x="170" y="100" width="160" height="80" rx="40" fill="#fbbf24" opacity="0.6" filter="url(#chest-glow)" />
          <rect x="200" y="80" width="100" height="100" rx="30" fill="#fef3c7" opacity="0.4" filter="url(#chest-glow)" />
          <polygon points="210,170 290,170 320,60 180,60" fill="#fbbf24" opacity="0.3" filter="url(#chest-glow)" />
        </g>
      )}

      <g
        id="chest-top"
        className={isOpen ? "chest-lid-open-anim" : isShaking ? "chest-lid-shake-anim" : ""}
        style={{ transformOrigin: "250px 185px" }}
      >
        <rect x="102" y="35" width="296" height="150" rx="4" fill={primaryDark} />
        <rect x="104" y="37" width="292" height="146" rx="3" fill="url(#chest-lid-grad)" />

        <rect x="104" y="37" width="292" height="20" rx="3" fill={primaryLight} opacity="0.2" />

        <rect x="87" y="31" width="326" height="160" rx="4" fill="none" stroke={metalDark} strokeWidth="0" />

        <rect x="237" y="31" width="24" height="154" rx="2" fill={metalDark} />
        <rect x="239" y="31" width="20" height="154" rx="2" fill="url(#chest-band-grad)" />
        <rect x="239" y="31" width="20" height="10" rx="2" fill={metalLight} opacity="0.3" />

        <rect x="87" y="31" width="22" height="154" rx="2" fill={metalDark} />
        <rect x="89" y="31" width="18" height="154" rx="2" fill="url(#chest-band-grad)" />
        <rect x="89" y="31" width="18" height="10" rx="2" fill={metalLight} opacity="0.3" />

        <rect x="389" y="31" width="22" height="154" rx="2" fill={metalDark} />
        <rect x="391" y="31" width="18" height="154" rx="2" fill="url(#chest-band-grad)" />
        <rect x="391" y="31" width="18" height="10" rx="2" fill={metalLight} opacity="0.3" />

        <rect x="104" y="35" width="292" height="10" rx="2" fill={primaryDarker} opacity="0.3" />

        <rect x="145" y="40" width="56" height="90" rx="3" fill={primaryDarker} opacity="0.4" />
        <rect x="147" y="42" width="52" height="86" rx="2" fill={primary} opacity="0.6" />

        <rect x="297" y="40" width="56" height="86" rx="3" fill={primaryDarker} opacity="0.4" />
        <rect x="299" y="42" width="52" height="82" rx="2" fill={primary} opacity="0.6" />

        <circle cx="369" cy="167" r="12" fill={metalDark} />
        <circle cx="369" cy="165" r="12" fill="url(#chest-band-grad)" />
        <circle cx="369" cy="163" r="5" fill={metalLight} opacity="0.4" />

        <circle cx="131" cy="167" r="12" fill={metalDark} />
        <circle cx="131" cy="165" r="12" fill="url(#chest-band-grad)" />
        <circle cx="131" cy="163" r="5" fill={metalLight} opacity="0.4" />
      </g>

      <g id="chest-lock" className={isOpen ? "chest-lock-hide-anim" : ""}>
        <rect x="207" y="154" width="96" height="83" rx="6" fill={metalDark} />
        <rect x="201" y="146" width="96" height="83" rx="6" fill="url(#chest-lock-grad)" filter="url(#chest-inner-shadow)" />
        <rect x="203" y="148" width="92" height="6" rx="2" fill={metalLight} opacity="0.3" />
        <rect x="201" y="144" width="96" height="11" rx="3" fill={accent} />
        <rect x="201" y="144" width="96" height="4" rx="2" fill={metalLight} opacity="0.4" />

        <circle cx="251" cy="179" r="12.5" fill={metalDark} />
        <circle cx="251" cy="179" r="9" fill={primaryDarker} />
        <circle cx="251" cy="179" r="6" fill={shadow} />

        <path
          d="M251,192 L251,192 a6.86,6.86,0,0,1-6.82-7.61 l2.36-5.72 h8.93 l2.36,5.72 A6.87,6.87,0,0,1,251,192Z"
          fill={metalDark}
        />
      </g>

      <g id="chest-sparkles" className={isReady ? "chest-sparkles-visible" : "chest-sparkles-hidden"}>
        <path
          className="chest-sparkle-1"
          d="M207,115s-19.5-5.5-23.8-23.8c-4.7,19.2-23.8,23.8-23.8,23.8s18.4,4.4,23.8,23.8C187.4,119.6,207,115,207,115Z"
          fill={sparkleColor}
          opacity="0.9"
        />
        <path
          className="chest-sparkle-2"
          d="M177,159s-13.2-3.7-16.2-16.2c-3.2,13-16.2,16.2-16.2,16.2s12.5,3,16.2,16.2C163.7,161.8,177,159,177,159Z"
          fill={sparkleColor}
          opacity="0.7"
        />
        <path
          className="chest-sparkle-3"
          d="M349,123s-13.2-3.7-16.2-16.2c-3.2,13-16.2,16.2-16.2,16.2s12.5,3,16.2,16.2C335.9,125.7,349,123,349,123Z"
          fill={sparkleColor}
          opacity="0.8"
        />
      </g>

      {chestState === "burst" && canOpen && (
        <g className="chest-burst-particles">
          {[...Array(16)].map((_, i) => {
            const angle = (i * 22.5) * (Math.PI / 180)
            const dist = 80 + Math.random() * 60
            const cx = 250 + Math.cos(angle) * 20
            const cy = 150 + Math.sin(angle) * 10
            const tx = 250 + Math.cos(angle) * dist
            const ty = 150 + Math.sin(angle) * dist
            const colors = ["#fbbf24", "#f59e0b", "#fef3c7", "#fde68a", "#d97706"]
            const size = 3 + Math.random() * 4
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={size}
                fill={colors[i % colors.length]}
                style={{
                  animation: `chest-particle-move 0.8s ease-out forwards`,
                  animationDelay: `${i * 30}ms`,
                  "--tx": `${tx - cx}px`,
                  "--ty": `${ty - cy}px`,
                }}
              />
            )
          })}
        </g>
      )}

      {!canOpen && chestState === "idle" && (
        <g>
          <rect x="210" y="155" width="80" height="70" rx="5" fill="#18181b" opacity="0.3" />
          <g transform="translate(250, 185)">
            <circle r="16" fill="#27272a" opacity="0.9" stroke="#3f3f46" strokeWidth="2" />
            <rect x="-5" y="-8" width="10" height="10" rx="2" fill="none" stroke="#71717a" strokeWidth="2" />
            <rect x="-3" y="0" width="6" height="8" rx="1" fill="#71717a" />
          </g>
        </g>
      )}
    </svg>
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

  const fetchStatus = useCallback(async () => {
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
            <div className="w-48 h-40 bg-zinc-800 rounded-2xl" />
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
        @keyframes chest-svg-shake-kf {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-4px) rotate(-2deg); }
          20% { transform: translateX(4px) rotate(2deg); }
          30% { transform: translateX(-6px) rotate(-3deg); }
          40% { transform: translateX(6px) rotate(3deg); }
          50% { transform: translateX(-8px) rotate(-4deg); }
          60% { transform: translateX(8px) rotate(4deg); }
          70% { transform: translateX(-6px) rotate(-3deg); }
          80% { transform: translateX(4px) rotate(2deg); }
          90% { transform: translateX(-3px) rotate(-1deg); }
        }

        @keyframes chest-svg-breathe-kf {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.01); }
        }

        @keyframes chest-lid-open-kf {
          0% { transform: rotateX(0deg); }
          30% { transform: rotateX(-15deg); }
          50% { transform: rotateX(-5deg); }
          100% { transform: rotateX(-110deg); }
        }

        @keyframes chest-lid-shake-kf {
          0%, 100% { transform: rotateX(0deg); }
          25% { transform: rotateX(-6deg); }
          50% { transform: rotateX(0deg); }
          75% { transform: rotateX(-8deg); }
        }

        @keyframes chest-lock-hide-kf {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(20px) scale(0.8); }
        }

        @keyframes chest-glow-beam-kf {
          0% { opacity: 0; transform: scaleY(0); }
          50% { opacity: 0.8; transform: scaleY(0.8); }
          100% { opacity: 1; transform: scaleY(1); }
        }

        @keyframes chest-sparkle-pulse-kf {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        @keyframes chest-sparkle-2-kf {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }

        @keyframes chest-sparkle-3-kf {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        @keyframes chest-particle-move {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }

        @keyframes chest-badge-kf {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.1); }
        }

        .chest-svg-shake {
          animation: chest-svg-shake-kf 0.15s ease-in-out infinite;
        }

        .chest-svg-breathe {
          animation: chest-svg-breathe-kf 3s ease-in-out infinite;
        }

        .chest-lid-open-anim {
          animation: chest-lid-open-kf 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: 250px 35px;
        }

        .chest-lid-shake-anim {
          animation: chest-lid-shake-kf 0.3s ease-in-out infinite;
          transform-origin: 250px 185px;
        }

        .chest-lock-hide-anim {
          animation: chest-lock-hide-kf 0.5s ease-out forwards;
        }

        .chest-glow-beam-anim {
          animation: chest-glow-beam-kf 1s ease-out forwards;
          transform-origin: 250px 170px;
        }

        .chest-sparkles-visible .chest-sparkle-1 {
          animation: chest-sparkle-pulse-kf 2s ease-in-out infinite;
          transform-origin: 183px 115px;
        }

        .chest-sparkles-visible .chest-sparkle-2 {
          animation: chest-sparkle-2-kf 2.5s ease-in-out infinite 0.3s;
          transform-origin: 161px 159px;
        }

        .chest-sparkles-visible .chest-sparkle-3 {
          animation: chest-sparkle-3-kf 2.2s ease-in-out infinite 0.6s;
          transform-origin: 333px 123px;
        }

        .chest-sparkles-hidden {
          opacity: 0;
        }

        .chest-badge-anim {
          animation: chest-badge-kf 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative mb-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/95 to-zinc-950 border border-zinc-800/80 p-6 sm:p-8">
          {isReady && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-500/5 blur-[60px] pointer-events-none" />
            </>
          )}

          {chestState === "burst" && (
            <div className="absolute inset-0 bg-amber-400/20 backdrop-blur-sm z-10 pointer-events-none rounded-2xl animate-pulse" />
          )}

          <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <div className="relative">
              <button
                onClick={handleOpenChest}
                disabled={!canOpen || opening}
                className={`relative group outline-none w-52 h-44 sm:w-60 sm:h-48 ${canOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
                aria-label={canOpen ? t("dailyChest.open") : t("dailyChest.locked")}
              >
                <ChestSVG canOpen={canOpen} chestState={chestState} />

                {isReady && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 chest-badge-anim">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-b from-green-400 to-green-600 shadow-lg shadow-green-500/50 flex items-center justify-center">
                        <span className="text-white font-black text-xs leading-none">!</span>
                      </div>
                      <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
                    </div>
                  </div>
                )}
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
                <div className={`p-1.5 rounded-lg ${canOpen ? "bg-amber-500/15" : "bg-zinc-800/50"}`}>
                  <Gift className={`w-5 h-5 ${canOpen ? "text-amber-400" : "text-zinc-500"}`} />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{t("dailyChest.title")}</h3>
                {canOpen && (
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/25 rounded-full">
                    {t("dailyChest.available")}
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-400 mb-5 max-w-md leading-relaxed">{t("dailyChest.description")}</p>

              {canOpen ? (
                <button
                  onClick={handleOpenChest}
                  disabled={opening}
                  className={`
                    inline-flex items-center justify-center gap-2.5 px-7 py-3 text-sm font-bold uppercase tracking-wide
                    rounded-xl transition-all duration-200 cursor-pointer
                    ${
                      opening
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
