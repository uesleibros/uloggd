import { useEffect, useRef } from "react"

let originalFavicon = null
let canvas = null
let ctx = null

function getOriginalFavicon() {
  if (originalFavicon) return Promise.resolve(originalFavicon)

  return new Promise((resolve) => {
    const link = document.querySelector("link[rel~='icon']")
    if (!link) {
      resolve(null)
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      originalFavicon = img
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = link.href
  })
}

function ensureCanvas() {
  if (!canvas) {
    canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    ctx = canvas.getContext("2d")
  }
  return { canvas, ctx }
}

function updateFaviconLink(dataUrl) {
  let link = document.querySelector("link[rel~='icon']")

  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    document.head.appendChild(link)
  }

  link.type = "image/png"
  link.href = dataUrl
}

async function setFaviconBadge(count) {
  const img = await getOriginalFavicon()
  if (!img) return

  const { canvas, ctx } = ensureCanvas()
  const size = canvas.width

  ctx.clearRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)

  if (count <= 0) {
    updateFaviconLink(canvas.toDataURL("image/png"))
    return
  }

  const text = count > 99 ? "99+" : String(count)
  const fontSize = text.length > 2 ? 22 : 28
  ctx.font = `bold ${fontSize}px -apple-system, "Segoe UI", sans-serif`

  const textMetrics = ctx.measureText(text)
  const textWidth = textMetrics.width
  const badgeHeight = 30
  const badgePadding = 8
  const badgeWidth = Math.max(badgeHeight, textWidth + badgePadding * 2)

  const badgeX = size - badgeWidth - 1
  const badgeY = 1

  ctx.save()
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)"
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2

  ctx.fillStyle = "#ef4444"
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2)
  ctx.stroke()

  ctx.fillStyle = "#ffffff"
  ctx.font = `bold ${fontSize}px -apple-system, "Segoe UI", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 1)

  updateFaviconLink(canvas.toDataURL("image/png"))
}

async function clearFaviconBadge() {
  const img = await getOriginalFavicon()
  if (!img) return

  const { canvas, ctx } = ensureCanvas()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  updateFaviconLink(canvas.toDataURL("image/png"))
}

export function useFaviconBadge(count) {
  useEffect(() => {
    if (count > 0) {
      setFaviconBadge(count)
    } else {
      clearFaviconBadge()
    }

    return () => {
      clearFaviconBadge()
    }
  }, [count])
}