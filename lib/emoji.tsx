import twemoji from "@twemoji/api";
import type { ReactNode } from "react";

const ZERO_WIDTH_JOINER = "\u200D";
const VARIATION_SELECTOR = /\uFE0F/g;

function iconId(raw: string) {
  return twemoji.convert.toCodePoint(
    raw.includes(ZERO_WIDTH_JOINER) ? raw : raw.replace(VARIATION_SELECTOR, ""),
  );
}

export function withEmoji(text: string | null | undefined): ReactNode {
  if (!text) return text ?? null;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  twemoji.replace(text, (...args: unknown[]) => {
    const raw = args[0] as string;
    const offset = args[args.length - 2] as number;
    const id = iconId(raw);
    if (!id) return raw;
    if (offset > cursor) parts.push(text.slice(cursor, offset));
    parts.push(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={key++}
        className="twemoji"
        src={`${twemoji.base}svg/${id}.svg`}
        alt={raw}
        draggable={false}
        loading="lazy"
        decoding="async"
      />,
    );
    cursor = offset + raw.length;
    return raw;
  });

  if (parts.length === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
