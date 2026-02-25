export function colorToRGB(colorName) {
  if (typeof document === "undefined") return { r: 161, g: 161, b: 170 }

  const ctx = document.createElement("canvas").getContext("2d")
  ctx.fillStyle = colorName
  const hex = ctx.fillStyle

  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

export function getBadgeStyles(color) {
  const { r, g, b } = colorToRGB(color || "gray")

  return {
    gradient: `linear-gradient(135deg, rgba(${r},${g},${b},0.2), rgba(${r},${g},${b},0.05))`,
    border: `rgba(${r},${g},${b},0.3)`,
    glow: `0 0 20px rgba(${r},${g},${b},0.1)`,
    iconBg: `rgba(${r},${g},${b},0.1)`,
  }
}