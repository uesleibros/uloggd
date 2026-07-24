/** The 12 tier colours the editor offers, matching the seeded defaults. */
export const TIER_COLORS = [
  "#e35d6a",
  "#f0883e",
  "#e3b341",
  "#57ab5a",
  "#539bf5",
  "#6cb6ff",
  "#986ee2",
  "#c297ff",
  "#ec6cb9",
  "#768390",
  "#39c5cf",
  "#a2d2fb",
] as const;

/** Longest a tier label may be. Beyond a short word it stops being a tier. */
export const TIER_LABEL_MAX = 24;

/**
 * Shrinks the tier label as it gets longer so a one-letter "S" stays big and a
 * long word still fits the plate instead of overflowing or wrapping to a blur.
 * `base` scales the whole ramp for the two sizes the label renders at (board
 * vs. editor).
 */
export function tierLabelFontSize(label: string, base = 1): number {
  const n = label.trim().length;
  const size =
    n <= 2
      ? 18
      : n <= 4
        ? 15
        : n <= 7
          ? 12
          : n <= 12
            ? 10
            : n <= 18
              ? 8.5
              : 7.5;
  return Math.round(size * base * 10) / 10;
}

/**
 * Black or white for a label sitting on `hex`, by perceived luminance. Keeps a
 * yellow tier's letter readable without a per-colour lookup table.
 */
export function readableInk(hex: string): "#0b0a0d" | "#ffffff" {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return "#ffffff";
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  // Rec. 601 luma; 0.6 is the crossover that reads best on these swatches.
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? "#0b0a0d" : "#ffffff";
}
