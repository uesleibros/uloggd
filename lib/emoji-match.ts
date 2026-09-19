import twemoji from "@twemoji/api";

/**
 * Where the emoji in a piece of text are, and which Twemoji image draws each.
 *
 * Every place that draws emoji as images reads them from here: text React
 * renders (lib/emoji.tsx), markdown (lib/rehype-emoji.ts) and the page-wide
 * pass over what neither of those covers (components/twemoji-manager.tsx).
 * They used to keep a copy each, so a fix in one left the other two drawing
 * the same text differently.
 */

const ZERO_WIDTH_JOINER = "‍";
const VARIATION_SELECTOR = /️/g;

/**
 * Emoji the bundled pattern does not recognise: ☝ ⛷ ⛹ ✌ ✍.
 *
 * All five can take a skin tone, and @twemoji/api 17.0.3 (the latest) only
 * matches what follows them, so "✌️" came back as a lone variation selector
 * with no image, and "✌🏽" as a bare skin-tone swatch next to a plain ✌.
 * When a match starts right after one of these, the base belongs to it.
 */
const MISSED_BASES = new Set([0x261d, 0x26f7, 0x26f9, 0x270c, 0x270d]);
const SKIN_TONE = /^[\u{1F3FB}-\u{1F3FF}]/u;

export type EmojiMatch = {
  /** The characters as written, for the image's alt text. */
  raw: string;
  /** Where they start in the text, in UTF-16 units. */
  offset: number;
  src: string;
};

function iconId(raw: string) {
  return twemoji.convert.toCodePoint(
    raw.includes(ZERO_WIDTH_JOINER) ? raw : raw.replace(VARIATION_SELECTOR, ""),
  );
}

export function findEmoji(text: string): EmojiMatch[] {
  const found: EmojiMatch[] = [];
  twemoji.replace(text, (...args: unknown[]) => {
    let raw = args[0] as string;
    let offset = args[args.length - 2] as number;
    const before = offset > 0 ? text.charCodeAt(offset - 1) : -1;
    if (
      MISSED_BASES.has(before) &&
      (raw.startsWith("️") || SKIN_TONE.test(raw))
    ) {
      raw = text[offset - 1] + raw;
      offset -= 1;
    }
    const id = iconId(raw);
    if (id) found.push({ raw, offset, src: `${twemoji.base}svg/${id}.svg` });
    return raw;
  });
  return found;
}

/**
 * The text cut at its emoji: plain runs as strings, emoji as their match.
 * Null when there is nothing to draw, so callers can leave the text alone.
 */
export function splitEmoji(text: string): (string | EmojiMatch)[] | null {
  const matches = findEmoji(text);
  if (matches.length === 0) return null;
  const parts: (string | EmojiMatch)[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.offset > cursor) parts.push(text.slice(cursor, match.offset));
    parts.push(match);
    cursor = match.offset + match.raw.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
