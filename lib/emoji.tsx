import type { ReactNode } from "react";
import { splitEmoji } from "./emoji-match";

export function withEmoji(text: string | null | undefined): ReactNode {
  if (!text) return text ?? null;
  const parts = splitEmoji(text);
  if (!parts) return text;
  return parts.map((part, key) =>
    typeof part === "string" ? (
      part
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={key}
        className="twemoji"
        src={part.src}
        alt={part.raw}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    ),
  );
}
