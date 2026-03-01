import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

const MINERALS_CONFIG = [
  { key: "copper", color: "#B87333" },
  { key: "iron", color: "#A8A8A8" },
  { key: "gold", color: "#FFD700" },
  { key: "emerald", color: "#50C878" },
  { key: "diamond", color: "#B9F2FF" },
  { key: "ruby", color: "#E0115F" },
]

function RewardCard({ mineralKey, amount, index, totalCards }) {
  const { t } = useTranslation("minerals")
  const mineral = MINERALS_CONFIG.find((m) => m.key === mineralKey)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), index * 400 + 300)
    return () => clearTimeout(timer)
  }, [index])

  if (!mineral || amount <= 0) return null

  return (
    <div
      className={`
        relative transition-all duration-500 ease-out
        ${revealed ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-75"}
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div
        className={`
          relative w-24 h-32 rounded-xl overflow-hidden
          transition-transform duration-300 hover:scale-105
          ${revealed ? "animate-card-float" : ""}
        `}
        style={{ animationDelay: `${index * 150}ms` }}
      >
        {revealed && (
          <div
            className="absolute -inset-1 rounded-xl opacity-60 blur-md animate-pulse"
            style={{ backgroundColor: mineral.color }}
          />
        )}

        <div
          className="relative w-full h-full rounded-xl p-3 flex flex-col items-center justify-between"
          style={{
            background: `linear-gradient(145deg, ${mineral.color}30, ${mineral.color}10)`,
            border: `2px solid ${mineral.color}60`,
          }}
        >
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-12 h-12 rounded-lg shadow-lg"
              style={{
                backgroundColor: mineral.color,
                boxShadow: `0 4px 20px ${mineral.color}50`,
              }}
            />
          </div>

          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: mineral.color }}
            >
              +{amount}
            </div>
            <div className="text-xs text-zinc-400 font-medium truncate max-w-full">
              {t(`items.${mineral.key}.name`)}
            </div>
          </div>
        </div>

        {revealed && (
          <>
            <div
              className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: mineral.color }}
            />
            <div
              className="absolute bottom-2 left-2 w-1 h-1 rounded-full animate-ping"
              style={{ backgroundColor: mineral.color, animationDelay: "150ms" }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function ChestOpenModal({ isOpen, onClose, rewards }) {
  const { t } = useTranslation("minerals")
  const [phase, setPhase] = useState("closed")

  useEffect(() => {
    if (isOpen && rewards) {
      setPhase("opening")
      const timer1 = setTimeout(() => setPhase("revealing"), 500)
      return () => clearTimeout(timer1)
    } else {
      setPhase("closed")
    }
  }, [isOpen, rewards])

  if (!rewards) return null

  const rewardEntries = Object.entries(rewards).filter(([_, amount]) => amount > 0)
  const totalMinerals = Object.values(rewards).reduce((sum, val) => sum + val, 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="relative">
        {phase === "opening" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-32 h-32 bg-amber-400/80 rounded-full blur-3xl animate-ping" />
          </div>
        )}

        <div
          className={`
            overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800
            transition-all duration-500
            ${phase === "opening" ? "scale-95 opacity-50" : "scale-100 opacity-100"}
          `}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative px-6 pt-10 pb-8">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative text-center mb-8">
              <h2
                className={`
                  text-2xl font-bold text-white mb-2
                  transition-all duration-500
                  ${phase === "revealing" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
                `}
              >
                {t("dailyChest.opened")}
              </h2>
              <p
                className={`
                  text-sm text-zinc-400
                  transition-all duration-500 delay-100
                  ${phase === "revealing" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
                `}
              >
                {t("dailyChest.youGot", { count: totalMinerals })}
              </p>
            </div>

            <div
              className={`
                flex flex-wrap justify-center gap-4 mb-8 min-h-[140px]
                transition-all duration-300
                ${phase === "revealing" ? "opacity-100" : "opacity-0"}
              `}
            >
              {rewardEntries.map(([key, amount], index) => (
                <RewardCard
                  key={key}
                  mineralKey={key}
                  amount={amount}
                  index={index}
                  totalCards={rewardEntries.length}
                />
              ))}
            </div>

            <button
              onClick={onClose}
              className={`
                w-full px-6 py-3.5 text-sm font-semibold text-amber-900
                bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400
                rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40
                transition-all cursor-pointer
                ${phase === "revealing" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
              `}
              style={{ transitionDelay: `${rewardEntries.length * 400 + 500}ms` }}
            >
              {t("dailyChest.claim")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}