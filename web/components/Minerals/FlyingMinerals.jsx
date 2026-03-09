import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { MINERALS } from "./MineralRow"

function FlyingMineral({ image, startX, startY, endX, endY, delay, onComplete }) {
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
        <div className="absolute inset-0 rounded-full blur-md opacity-60 animate-pulse bg-amber-400" />
        <img
          src={image}
          alt=""
          className="relative w-5 h-5 object-contain drop-shadow-lg"
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

      const config = MINERALS.find((m) => m.key === key)
      if (!config) continue

      const count = Math.min(amount, 5)

      for (let i = 0; i < count; i++) {
        mineralList.push({
          id: `${key}-${i}`,
          image: config.image,
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
          image={mineral.image}
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
