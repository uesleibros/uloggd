import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import FlyingMinerals from "./FlyingMinerals"
import { MINERALS } from "./MineralRow"

function RewardCard({ mineralKey, amount, index }) {
  const { t } = useTranslation("minerals")
  const mineral = MINERALS.find((m) => m.key === mineralKey)
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
          <div className="absolute -inset-1 rounded-xl opacity-40 blur-md animate-pulse bg-amber-400" />
        )}

        <div className="relative w-full h-full rounded-xl p-3 flex flex-col items-center justify-between bg-zinc-800/80 border-2 border-zinc-700/80">
          <div className="flex-1 flex items-center justify-center">
            <img
              src={mineral.image}
              alt={t(`items.${mineral.key}.name`)}
              className="w-12 h-12 object-contain drop-shadow-lg"
            />
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">
              +{amount}
            </div>
            <div className="text-xs text-zinc-400 font-medium truncate max-w-full">
              {t(`items.${mineral.key}.name`)}
            </div>
          </div>
        </div>

        {revealed && (
          <>
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-ping bg-amber-400" />
            <div
              className="absolute bottom-2 left-2 w-1 h-1 rounded-full animate-ping bg-amber-400"
              style={{ animationDelay: "150ms" }}
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
  const [showFlying, setShowFlying] = useState(false)
  const cardsRef = useRef(null)

  useEffect(() => {
    if (isOpen && rewards) {
      setPhase("opening")
      setShowFlying(false)
      const timer1 = setTimeout(() => setPhase("revealing"), 500)
      return () => clearTimeout(timer1)
    } else {
      setPhase("closed")
      setShowFlying(false)
    }
  }, [isOpen, rewards])

  function handleClose() {
    if (phase === "revealing") {
      setShowFlying(true)
    } else {
      window.dispatchEvent(new CustomEvent("minerals-updated"))
      onClose()
    }
  }

  function handleFlyingComplete() {
    setShowFlying(false)
    window.dispatchEvent(new CustomEvent("minerals-updated"))
    onClose()
  }

  if (!rewards) return null

  const rewardEntries = Object.entries(rewards).filter(([_, amount]) => amount > 0)
  const totalMinerals = Object.values(rewards).reduce((sum, val) => sum + val, 0)

  return (
    <>
      <Modal
        isOpen={isOpen && !showFlying}
        onClose={handleClose}
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
              onClick={handleClose}
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
                ref={cardsRef}
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
                  />
                ))}
              </div>

              <button
                onClick={handleClose}
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

      {showFlying && (
        <FlyingMinerals
          rewards={rewards}
          originRef={cardsRef}
          destinationId="minerals-wallet"
          onComplete={handleFlyingComplete}
        />
      )}
    </>
  )
}
