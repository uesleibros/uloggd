import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

const MINERALS_CONFIG = [
  { key: "copper", color: "#B87333" },
  { key: "iron", color: "#A8A8A8" },
  { key: "gold", color: "#FFD700" },
  { key: "emerald", color: "#50C878" },
  { key: "diamond", color: "#B9F2FF" },
  { key: "ruby", color: "#E0115F" },
]

function FlyingMineral({ color, startX, startY, endX, endY, delay, onComplete }) {
  const [style, setStyle] = useState({
    left: startX,
    top: startY,
    opacity: 1,
    transform: "scale(1)",
  })

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setStyle({
        left: endX,
        top: endY,
        opacity: 0,
        transform: "scale(0.5)",
      })
    }, delay)

    const timer2 = setTimeout(() => {
      onComplete?.()
    }, delay + 800)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: style.left,
        top: style.top,
        opacity: style.opacity,
        transform: style.transform,
        transition: "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-md opacity-60 animate-pulse"
          style={{ backgroundColor: color }}
        />
        <div
          className="relative w-4 h-4 rounded-sm shadow-lg"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}80`,
          }}
        />
      </div>
    </div>
  )
}

export default function FlyingMinerals({ rewards, originRef, destinationId, onComplete }) {
  const [minerals, setMinerals] = useState([])
  const [completed, setCompleted] = useState(0)

  useEffect(() => {
    if (!rewards || !originRef?.current) return

    const origin = originRef.current.getBoundingClientRect()
    const destination = document.getElementById(destinationId)?.getBoundingClientRect()

    if (!destination) {
      onComplete?.()
      return
    }

    const startX = origin.left + origin.width / 2
    const startY = origin.top + origin.height / 2
    const endX = destination.left + destination.width / 2
    const endY = destination.top + destination.height / 2

    const mineralList = []
    let index = 0

    for (const [key, amount] of Object.entries(rewards)) {
      if (amount <= 0) continue

      const config = MINERALS_CONFIG.find((m) => m.key === key)
      if (!config) continue

      const count = Math.min(amount, 5)

      for (let i = 0; i < count; i++) {
        mineralList.push({
          id: `${key}-${i}`,
          color: config.color,
          startX: startX + (Math.random() - 0.5) * 40,
          startY: startY + (Math.random() - 0.5) * 40,
          endX: endX + (Math.random() - 0.5) * 10,
          endY: endY,
          delay: index * 80,
        })
        index++
      }
    }

    setMinerals(mineralList)
    setCompleted(0)
  }, [rewards, originRef, destinationId])

  useEffect(() => {
    if (minerals.length > 0 && completed >= minerals.length) {
      onComplete?.()
    }
  }, [completed, minerals.length])

  function handleMineralComplete() {
    setCompleted((prev) => prev + 1)
  }

  if (minerals.length === 0) return null

  return createPortal(
    <>
      {minerals.map((mineral) => (
        <FlyingMineral
          key={mineral.id}
          color={mineral.color}
          startX={mineral.startX}
          startY={mineral.startY}
          endX={mineral.endX}
          endY={mineral.endY}
          delay={mineral.delay}
          onComplete={handleMineralComplete}
        />
      ))}
    </>,
    document.body
  )
}