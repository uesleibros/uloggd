import { useEffect, useState, useLayoutEffect } from "react"
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
  }, [endX, endY, delay, onComplete])

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: `${style.left}px`,
        top: `${style.top}px`,
        opacity: style.opacity,
        transform: `${style.transform} translate(-50%, -50%)`,
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

  useLayoutEffect(() => {
    if (!rewards || !originRef?.current) return

    const calculatePositions = () => {
      const origin = originRef.current?.getBoundingClientRect()
      const destinationElement = document.getElementById(destinationId)
      const destination = destinationElement?.getBoundingClientRect()

      if (!origin || !destination) {
        onComplete?.()
        return
      }

      const isDestinationVisible = 
        destination.width > 0 && 
        destination.height > 0 &&
        destination.top >= 0 &&
        destination.top <= window.innerHeight

      if (!isDestinationVisible) {
        const fallbackDestination = {
          left: window.innerWidth - 60,
          top: 40,
          width: 40,
          height: 40,
        }
        return createMinerals(origin, fallbackDestination)
      }

      createMinerals(origin, destination)
    }

    const createMinerals = (origin, destination) => {
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
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calculatePositions()
      })
    })
  }, [rewards, originRef, destinationId, onComplete])

  useEffect(() => {
    if (minerals.length > 0 && completed >= minerals.length) {
      onComplete?.()
    }
  }, [completed, minerals.length, onComplete])

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
