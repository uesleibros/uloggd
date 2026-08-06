/**
 * A theme built from one colour the reader picked.
 *
 * The whole design rests on one decision: a custom theme is not a sixth
 * palette, it is the light or the dark palette with its surfaces retinted.
 * `data-theme` stays `light` or `dark`, so every rule already written keeps
 * working — including the parts that ask which side they are on, like the
 * profile showcase — and only the surfaces move. Nothing has to be described
 * twice, and a component written next year inherits the custom theme without
 * knowing it exists.
 *
 * The semantic colours are deliberately left alone. Status, danger, gold and
 * the brand mean something; a "playing" chip drifting toward the reader's
 * favourite purple is a chip that no longer reads at a glance.
 *
 * The part worth being careful about is contrast. The text was chosen against
 * the untinted surfaces, so retinting them can quietly break a pair that used
 * to pass. Rather than trust the arithmetic to be kind, the tint is applied
 * and then measured, and something gives way until every text token clears AA
 * on every surface it can land on. A theme somebody cannot read is not a
 * preference, it is a broken page they chose for themselves.
 */

/** Under this, the picked colour is treated as a dark theme. */
const LIGHT_THRESHOLD = 0.4;

/** WCAG AA for normal text. The same figure the palette test uses. */
const AA_NORMAL = 4.5;

export type ThemeBase = "light" | "dark";

export type CustomTheme = {
  /** Which palette this rides on, and what `data-theme` is set to. */
  base: ThemeBase;
  /** Overrides, as CSS custom property names without the leading dashes. */
  tokens: Record<string, string>;
  /** How much of the picked colour survived, 0 to 1. */
  strength: number;
};

type Rgb = { r: number; g: number; b: number };

export function parseHex(value: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: Rgb): string {
  const part = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(colour: Rgb): number {
  return (
    0.2126 * channel(colour.r) +
    0.7152 * channel(colour.g) +
    0.0722 * channel(colour.b)
  );
}

export function contrast(a: Rgb, b: Rgb): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * Which palette a colour belongs to.
 *
 * Luminance rather than lightness, because a saturated yellow and a saturated
 * blue of the same nominal lightness are not equally bright to the eye, and
 * this decision is about how bright the page will feel.
 */
export function baseFor(colour: Rgb): ThemeBase {
  return luminance(colour) >= LIGHT_THRESHOLD ? "light" : "dark";
}

/**
 * Mix `amount` of `tint` into `surface`, in plain sRGB.
 *
 * Rounded here rather than on the way out, so that what gets measured is what
 * gets written. Checking the contrast of a fractional colour and then emitting
 * its rounded neighbour produced a theme that failed by a hundredth — real,
 * and invisible, since the numbers in the check all looked fine.
 */
function mix(surface: Rgb, tint: Rgb, amount: number): Rgb {
  return {
    r: Math.round(surface.r + (tint.r - surface.r) * amount),
    g: Math.round(surface.g + (tint.g - surface.g) * amount),
    b: Math.round(surface.b + (tint.b - surface.b) * amount),
  };
}

/** Text token names, in the order each palette lists its text. */
const TEXT_TOKENS = ["screen-white", "screen-dim", "screen-muted"] as const;

/**
 * The surfaces of each palette and the text that lands on them.
 *
 * Copied from the two theme blocks in `globals.css` rather than read from
 * them, because this runs in a browser where the stylesheet is not available
 * as data. A test compares the two so they cannot drift apart.
 */
export const PALETTES: Record<
  ThemeBase,
  { surfaces: Record<string, string>; text: string[] }
> = {
  dark: {
    surfaces: {
      "console-black": "#0b0a0d",
      "console-canvas": "#0f0e11",
      "console-panel": "#17151b",
      "console-raised": "#1c1a20",
      "console-inset": "#0c0b0e",
      "console-hover": "#222027",
    },
    text: ["#f4f2f6", "#aaa5af", "#8f8a94"],
  },
  light: {
    surfaces: {
      "console-black": "#e3e5e9",
      "console-canvas": "#f5f6f8",
      "console-panel": "#ffffff",
      "console-raised": "#edeef2",
      "console-inset": "#e6e8ec",
      "console-hover": "#dfe2e7",
    },
    text: ["#17191e", "#4f535d", "#5c616b"],
  },
};

/**
 * How far a text colour may be pushed to stay readable.
 *
 * It has to be allowed to move at all. With the text frozen, the only way to
 * keep contrast is to barely tint anything: a mid blue — the most asked-for
 * colour on any site like this — came out at five percent, which nobody would
 * call a theme.
 *
 * And it has to be bounded. Muted, dim and primary are three rungs of one
 * ladder; let muted climb far enough and it arrives at primary, and the page
 * loses the distinction it uses to say what matters. Sixty of two hundred and
 * fifty-five is roughly one rung.
 */
const TEXT_TRAVEL = 60;

/** Nudge a text colour away from the surfaces until it clears, or give up. */
function liftText(ink: Rgb, base: ThemeBase, surfaces: Rgb[]): Rgb | null {
  const clears = (c: Rgb) =>
    surfaces.every((surface) => contrast(c, surface) >= AA_NORMAL);
  if (clears(ink)) return ink;
  const towards = base === "dark" ? 255 : 0;
  for (let step = 1; step <= TEXT_TRAVEL; step++) {
    const moved = {
      r: ink.r + Math.sign(towards - ink.r) * step,
      g: ink.g + Math.sign(towards - ink.g) * step,
      b: ink.b + Math.sign(towards - ink.b) * step,
    };
    if (clears(moved)) return moved;
  }
  return null;
}

/**
 * The strongest tint the palette survives, and the text that goes with it.
 *
 * Tries the ceiling first and steps down. At each strength the text may move
 * within its bound; only when even that cannot save a token is the tint
 * reduced. The colour gives way last, which is the order somebody who has just
 * chosen a colour would expect.
 */
function fit(base: ThemeBase, tint: Rgb, ceiling: number) {
  const palette = PALETTES[base];
  const inks = palette.text.map((hex) => parseHex(hex)!);
  for (
    let amount = ceiling;
    amount > 0;
    amount = Math.round((amount - 0.05) * 100) / 100
  ) {
    const surfaces = Object.values(palette.surfaces).map((hex) =>
      mix(parseHex(hex)!, tint, amount),
    );
    const lifted = inks.map((ink) => liftText(ink, base, surfaces));
    if (lifted.every(Boolean))
      return { amount, surfaces, text: lifted as Rgb[] };
  }
  // Nothing worked, so nothing changes. Better a theme that ignores the pick
  // than one that cannot be read.
  return {
    amount: 0,
    surfaces: Object.values(palette.surfaces).map((hex) => parseHex(hex)!),
    text: inks,
  };
}

/**
 * The custom theme for a picked colour, or null if it is not a colour.
 *
 * `ceiling` is the most of the pick that may show through. Well under half on
 * purpose: these surfaces carry every word on the site, and a page tinted past
 * that stops being a theme and becomes a filter over one.
 */
export function deriveCustomTheme(
  value: string,
  ceiling = 0.35,
): CustomTheme | null {
  const tint = parseHex(value);
  if (!tint) return null;
  const base = baseFor(tint);
  const palette = PALETTES[base];
  const { amount, surfaces, text } = fit(base, tint, ceiling);
  const tokens: Record<string, string> = {};
  Object.keys(palette.surfaces).forEach((name, index) => {
    tokens[name] = toHex(surfaces[index]);
  });
  TEXT_TOKENS.forEach((name, index) => {
    tokens[name] = toHex(text[index]);
  });
  // The dividing lines are deliberately untouched. They are white or ink at a
  // few percent alpha, so they already take the hue of whatever ends up behind
  // them; replacing them with solid colour would be more code doing a worse
  // job.
  return { base, tokens, strength: amount };
}

/** The overrides as a style attribute value, for the root element. */
export function customThemeStyle(theme: CustomTheme): string {
  return Object.entries(theme.tokens)
    .map(([name, value]) => `--${name}:${value}`)
    .join(";");
}
