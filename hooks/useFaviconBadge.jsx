import { useEffect } from "react"

let originalFavicon = null
let canvas = null
let ctx = null
const CANVAS_SIZE = 80
const ICON_SIZE = 64
const ICON_OFFSET = 0

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
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
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

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.drawImage(img, ICON_OFFSET, ICON_OFFSET, ICON_SIZE, ICON_SIZE)

  if (count <= 0) {
    updateFaviconLink(canvas.toDataURL("image/png"))
    return
  }

  const text = count > 99 ? "99+" : String(count)
  const fontSize = text.length > 2 ? 26 : 32
  ctx.font = `bold ${fontSize}px -apple-system, "Segoe UI", sans-serif`

  const textMetrics = ctx.measureText(text)
  const textWidth = textMetrics.width
  const badgeHeight = 36
  const badgePadding = 10
  const badgeWidth = Math.max(badgeHeight, textWidth + badgePadding * 2)

  const badgeX = CANVAS_SIZE - badgeWidth
  const badgeY = CANVAS_SIZE - badgeHeight

  ctx.save()
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)"
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1

  ctx.fillStyle = "#ed4245"
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2)
  ctx.fill()
  ctx.restore()

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

  let link = document.querySelector("link[rel~='icon']")
  if (link && originalFavicon) {
    link.href = originalFavicon.src
  }
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